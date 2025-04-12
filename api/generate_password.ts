export {};

// Function to generate a random password
function generateRandomPassword(length: number = 12): string {
  const uppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercaseChars = "abcdefghijklmnopqrstuvwxyz";
  const numberChars = "0123456789";
//   const specialChars = "!@#$%^&*()-_=+[]{}|;:,.<>?";
  
  const allChars = uppercaseChars + lowercaseChars + numberChars;
  let password = "";
  
  // Ensure at least one character from each category
  password += uppercaseChars.charAt(Math.floor(Math.random() * uppercaseChars.length));
  password += lowercaseChars.charAt(Math.floor(Math.random() * lowercaseChars.length));
  password += numberChars.charAt(Math.floor(Math.random() * numberChars.length));
//   password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));
  
  // Fill the rest of the password with random characters
  for (let i = 4; i < length; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }
  
  // Shuffle the password
  password = password.split("").sort(() => 0.5 - Math.random()).join("");
  
  return password;
}

// Generate a random password
const randomPassword = generateRandomPassword();
console.log("Random password:", randomPassword);

// Hash the password
const hash = await Bun.password.hash(randomPassword);
console.log("Password hash:", hash);