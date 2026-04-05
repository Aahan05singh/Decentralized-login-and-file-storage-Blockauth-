# ⬡ BlockAuth — Blockchain Login + IPFS Storage

A decentralized identity and file storage app built as a CS project. Users register and authenticate using a smart contract on the **Sepolia testnet**, then upload files to **IPFS via Pinata**.

---

## Features

- 🔐 **On-chain authentication** — register/login via a Solidity smart contract (Sepolia testnet)
- 🦊 **MetaMask integration** — connect your wallet to identify yourself
- 📁 **IPFS file storage** — upload files to IPFS via [Pinata](https://pinata.cloud) (free tier supported)
- 🗂️ **Per-wallet file history** — browse, copy links, and delete your uploaded files
- 🖱️ **Drag & drop upload** — with file preview before uploading
- 💻 **Pure frontend** — no backend required, runs entirely in the browser

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | HTML, CSS, Vanilla JS |
| Blockchain | Solidity, Web3.js |
| Network | Ethereum Sepolia Testnet |
| Storage | IPFS via Pinata API |
| Wallet | MetaMask |

---

## Getting Started

### Prerequisites

- [MetaMask](https://metamask.io/) browser extension installed
- MetaMask configured for the **Sepolia testnet**
- Some **Sepolia ETH** (free from a faucet, e.g. [sepoliafaucet.com](https://sepoliafaucet.com))
- A free [Pinata](https://pinata.cloud) account for IPFS uploads

### Running Locally

1. **Clone the repo**
   ```bash
   git clone https://github.com/YOUR_USERNAME/blockauth.git
   cd blockauth
   ```

2. **Open in browser**

   Just open `index.html` directly, or serve it with any static server:
   ```bash
   npx serve .
   # or
   python3 -m http.server 8080
   ```

3. **Connect MetaMask** — click CONNECT and approve the Sepolia network

4. **Register** — pick a username and password, confirm the transaction

5. **Login** — enter your password to authenticate on-chain

6. **Upload files** — paste your Pinata JWT (from your Pinata dashboard → API Keys) and upload any file to IPFS

---

## Smart Contract

The contract is deployed on **Sepolia** at:

```
0x549AA1cB2791266C5Ce20C0e0Bf1A2d910bcBCb3
```

It stores a `bytes32` password hash and username per wallet address. Key functions:

| Function | Type | Description |
|---|---|---|
| `register(username, passwordHash)` | `nonpayable` | Register a new user |
| `login(passwordHash)` | `view` | Verify password, returns bool |
| `isRegistered()` | `view` | Check if wallet is registered |
| `getUsername()` | `view` | Get username for caller |

> **Note:** Passwords are hashed client-side with `keccak256` (via `web3.utils.soliditySha3`) before being sent to the contract. Never stored in plaintext.

---

## IPFS / Pinata Setup

1. Create a free account at [pinata.cloud](https://pinata.cloud)
2. Go to **API Keys** → Generate a new key with `pinFileToIPFS` permission
3. Copy the **JWT token**
4. Paste it into the app — it's saved in your browser's `localStorage` only, never transmitted elsewhere

> **Known limitation:** File CIDs are currently stored in `localStorage` (not on-chain) to avoid gas costs. A future version could store CIDs in a separate mapping on the contract.

---

## Project Structure

```
blockauth/
├── index.html      # App structure and markup
├── style.css       # All styles (dark theme)
├── script.js       # Web3 logic, IPFS upload, UI interactions
└── README.md
```

---

## Limitations & TODOs

- [ ] Store CIDs on-chain instead of `localStorage`
- [ ] Add file deletion from Pinata (requires API key with unpin permission)
- [ ] Support account recovery / password reset
- [ ] Mobile responsiveness improvements
- [ ] Deploy to a static host (GitHub Pages, Vercel, Netlify)

---

## License

MIT — see [LICENSE](LICENSE)
