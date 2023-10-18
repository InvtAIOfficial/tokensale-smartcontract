import helper from "./utils/helpers";

const ethPriceFeed = "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612" // Arbitrum mainnet ETH / USD feed

// The main deployment script
const main = async () => {
    await helper.deployContract("IvstSale", [ethPriceFeed]);
}
// Runs the deployment script, catching any errors
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
  });