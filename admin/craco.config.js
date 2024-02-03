const million = require("million/compiler");
const path = require("path");
module.exports = {
  webpack: {
    alias: {
      "@admin": path.resolve(__dirname),
      "@api": path.resolve(__dirname, "../api"),
    },
    plugins: { add: [million.webpack({ auto: true })] },
  },
};
