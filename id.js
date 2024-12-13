// id.js

// makeid function that generates a random string of 16 characters.
function makeid() {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; // Allowed characters
    const length = 16; // Length of the generated string
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length)); // Pick a random character
    }
    return result;
}

// Export the makeid function so it can be used in other files.
module.exports = { makeid };
