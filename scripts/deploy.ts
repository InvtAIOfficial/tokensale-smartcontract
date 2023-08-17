import helper from "./utils/helpers";

const ethPriceFeed = "0x"

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