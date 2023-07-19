import helper from "./utils/helpers";

const tokenName = "USDC Token";
const symbol = "USDC";
const decimal = 6;
const initialSupply = "1000000000000";

// The main deployment script
const main = async () => {
    await helper.deployContract("FaucetToken", [tokenName, symbol, decimal, initialSupply]);
}
// Runs the deployment script, catching any errors
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
  });