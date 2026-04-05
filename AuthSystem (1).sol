// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AuthSystem {

    struct User {
        string username;
        bytes32 passwordHash;
        bool exists;
    }

    mapping(address => User) private users;

    event UserRegistered(address indexed userAddress, string username);
    event UserLoggedIn(address indexed userAddress, bool success);

    function register(string memory _username, bytes32 _passwordHash) public {
        require(!users[msg.sender].exists, "User already registered");
        require(bytes(_username).length > 0, "Username cannot be empty");

        users[msg.sender] = User(_username, _passwordHash, true);
        emit UserRegistered(msg.sender, _username);
    }

    function login(bytes32 _passwordHash) public view returns (bool) {
        require(users[msg.sender].exists, "User not registered");
        return users[msg.sender].passwordHash == _passwordHash;
    }

    function getUsername() public view returns (string memory) {
        require(users[msg.sender].exists, "User not registered");
        return users[msg.sender].username;
    }

    function isRegistered() public view returns (bool) {
        return users[msg.sender].exists;
    }
}
