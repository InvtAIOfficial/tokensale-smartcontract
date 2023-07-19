import helper from "./utils/helpers";

const offeringToken = "0x"
const ethPriceFeed = "0x"

// The main deployment script
const main = async () => {
    await helper.deployContract("IvstSale", [offeringToken, ethPriceFeed]);
}
// Runs the deployment script, catching any errors
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
  });