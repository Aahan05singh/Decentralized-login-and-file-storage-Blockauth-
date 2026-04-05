// blockauth - blockchain login + ipfs storage
// TODO: store CIDs on-chain instead of localStorage (ran out of time lol)

let web3, contract, currentWallet, selectedFile = null;

const contractAddress = "contract address";
const abi = [ your abi
	;

// helper functions
const $ = id => document.getElementById(id);
const alert2 = (id, msg, type) => { const e = $(id); e.textContent = msg; e.className = `alert ${type} show`; };
const clearAlert = id => $(id).className = 'alert';
const setBtn = (id, loading) => { $(id).disabled = loading; $(id).classList.toggle('loading', loading); };
const hashPw = pw => web3.utils.soliditySha3({ type: 'string', value: pw });
const shortAddr = a => a.slice(0,6) + '...' + a.slice(-4);
const fmtBytes = b => b < 1024 ? b+' B' : b < 1048576 ? (b/1024).toFixed(1)+' KB' : (b/1048576).toFixed(1)+' MB';
const timeAgo = t => { let d=Date.now()-new Date(t); let m=~~(d/60000); return m<1?'just now':m<60?m+'m ago':~~(d/3600000)<24?~~(d/3600000)+'h ago':~~(d/86400000)+'d ago'; };

async function connectWallet() {
  if (!window.ethereum) return alert('install MetaMask first');
  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    web3 = new Web3(window.ethereum);
    contract = new web3.eth.Contract(abi, contractAddress);
    currentWallet = accounts[0];
    $('walletDot').classList.add('connected');
    $('walletAddress').textContent = shortAddr(accounts[0]);
    $('connectBtn').style.display = 'none';
    window.ethereum.on('accountsChanged', accs => accs.length ? (currentWallet=accs[0], $('walletAddress').textContent=shortAddr(accs[0]), logout()) : location.reload());
  } catch { alert('connection rejected'); }
}

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  $('tab'+tab[0].toUpperCase()+tab.slice(1)).classList.add('active');
  $('panel'+tab[0].toUpperCase()+tab.slice(1)).classList.add('active');
}

async function register() {
  clearAlert('registerAlert');
  if (!web3) return alert2('registerAlert', '⚠ connect wallet first', 'error');
  const username = $('regUsername').value.trim();
  const password = $('regPassword').value;
  if (!username || password.length < 6) return alert2('registerAlert', '⚠ fill in both fields (pw min 6 chars)', 'error');

  setBtn('btnRegister', true);
  alert2('registerAlert', '⏳ waiting for tx...', 'info');
  try {
    const [acc] = await web3.eth.getAccounts();
    await contract.methods.register(username, hashPw(password)).send({ from: acc });
    alert2('registerAlert', '✓ registered! switch to login tab', 'success');
    $('regUsername').value = ''; $('regPassword').value = '';
  } catch(err) {
    const msg = err?.message || 'tx failed';
    alert2('registerAlert', msg.includes('already registered') ? '⚠ wallet already registered' : '✗ '+msg, 'error');
  } finally { setBtn('btnRegister', false); }
}

async function login() {
  clearAlert('loginAlert');
  if (!web3) return alert2('loginAlert', '⚠ connect wallet first', 'error');
  const password = $('loginPassword').value;
  if (!password) return alert2('loginAlert', '⚠ enter password', 'error');

  setBtn('btnLogin', true);
  alert2('loginAlert', '⏳ checking on-chain...', 'info');
  try {
    const [acc] = await web3.eth.getAccounts();
    if (!await contract.methods.isRegistered().call({ from: acc }))
      return alert2('loginAlert', '⚠ not registered, sign up first', 'error');
    if (await contract.methods.login(hashPw(password)).call({ from: acc })) {
      showWelcome(await contract.methods.getUsername().call({ from: acc }));
    } else {
      alert2('loginAlert', '✗ wrong password', 'error');
    }
  } catch(err) { alert2('loginAlert', '✗ '+err.message, 'error'); }
  finally { setBtn('btnLogin', false); }
}

function showWelcome(username) {
  $('authPanels').style.display = 'none';
  $('welcomeScreen').classList.add('show');
  $('welcomeName').textContent = 'WELCOME, ' + username.toUpperCase();
  $('loginPassword').value = '';
  const saved = localStorage.getItem('pinata_jwt');
  if (saved) $('pinataJWT').value = saved;
  loadMyFiles();
}

function logout() {
  $('authPanels').style.display = 'block';
  $('welcomeScreen').classList.remove('show');
  ['loginAlert','registerAlert','uploadAlert'].forEach(clearAlert);
  selectedFile = null;
}

// pinata key - user needs a free account at pinata.cloud
function saveKey() {
  const jwt = $('pinataJWT').value.trim();
  if (!jwt) return alert2('uploadAlert', '⚠ paste your JWT first', 'error');
  localStorage.setItem('pinata_jwt', jwt);
  alert2('uploadAlert', '✓ key saved in browser', 'success');
}

function handleFileSelect(e) {
  selectedFile = e.target.files[0];
  if (selectedFile) {
    $('filePreview').style.display = 'flex';
    $('selectedFileName').textContent = selectedFile.name;
    $('selectedFileSize').textContent = fmtBytes(selectedFile.size);
    $('uploadArea').style.display = 'none';
  }
}

function clearFile() {
  selectedFile = null; $('fileInput').value = '';
  $('filePreview').style.display = 'none';
  $('uploadArea').style.display = 'flex';
}

// main upload function - posts to pinata api, saves cid to localStorage
async function uploadToIPFS() {
  clearAlert('uploadAlert');
  const jwt = $('pinataJWT').value.trim() || localStorage.getItem('pinata_jwt');
  if (!jwt) return alert2('uploadAlert', '⚠ need Pinata JWT', 'error');
  if (!selectedFile) return alert2('uploadAlert', '⚠ pick a file first', 'error');

  setBtn('btnUpload', true);
  alert2('uploadAlert', '⏳ uploading...', 'info');
  try {
    const fd = new FormData();
    fd.append('file', selectedFile);
    fd.append('pinataMetadata', JSON.stringify({ name: selectedFile.name, keyvalues: { wallet: currentWallet } }));

    const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST', headers: { Authorization: `Bearer ${jwt}` }, body: fd
    });
    if (!res.ok) throw new Error((await res.json())?.error || 'upload failed');

    const { IpfsHash: cid } = await res.json();

    // save cid to localStorage - not ideal but storing on-chain costs gas
    let files = JSON.parse(localStorage.getItem('ba_files') || '{}');
    const key = currentWallet.toLowerCase();
    if (!files[key]) files[key] = [];
    files[key].unshift({ name: selectedFile.name, size: selectedFile.size, cid, at: new Date().toISOString() });
    localStorage.setItem('ba_files', JSON.stringify(files));

    alert2('uploadAlert', `✓ done! CID: ${cid.slice(0,16)}...`, 'success');
    clearFile(); loadMyFiles();
  } catch(err) {
    alert2('uploadAlert', '✗ ' + err.message, 'error');
  } finally { setBtn('btnUpload', false); }
}

function loadMyFiles() {
  const files = (JSON.parse(localStorage.getItem('ba_files') || '{}')?.[currentWallet?.toLowerCase()] || []);
  const icons = { pdf:'📄',png:'🖼',jpg:'🖼',jpeg:'🖼',gif:'🖼',mp4:'🎬',mp3:'🎵',txt:'📝',json:'📋',zip:'🗜',sol:'⬡',js:'📜',html:'🌐',css:'🎨',py:'🐍' };
  $('filesContainer').innerHTML = files.length ? files.map(f => `
    <div class="file-entry">
      <div class="file-entry-icon">${icons[f.name.split('.').pop().toLowerCase()] || '📁'}</div>
      <div class="file-entry-info">
        <div class="file-entry-name">${f.name.length>22 ? f.name.slice(0,19)+'...' : f.name}</div>
        <div class="file-entry-meta">${fmtBytes(f.size)} · ${timeAgo(f.at)}</div>
        <div class="file-entry-cid">${f.cid.slice(0,24)}...</div>
      </div>
      <div class="file-entry-actions">
        <a href="https://gateway.pinata.cloud/ipfs/${f.cid}" target="_blank" class="action-btn view-btn">↗</a>
        <button class="action-btn copy-btn" onclick="navigator.clipboard.writeText('https://gateway.pinata.cloud/ipfs/${f.cid}').then(()=>{this.textContent='✓';setTimeout(()=>this.textContent='⎘',1500)})">⎘</button>
        <button class="action-btn del-btn" onclick="deleteFile('${f.cid}')">✕</button>
      </div>
    </div>`).join('') : '<div class="empty-files">no files yet</div>';
}

function deleteFile(cid) {
  let files = JSON.parse(localStorage.getItem('ba_files') || '{}');
  const key = currentWallet.toLowerCase();
  files[key] = (files[key] || []).filter(f => f.cid !== cid);
  localStorage.setItem('ba_files', JSON.stringify(files));
  loadMyFiles();
}
