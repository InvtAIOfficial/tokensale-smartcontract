import helper from "./utils/helpers";

const ethPriceFeed = "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612" // Arbitrum mainnet ETH / USD feed
// 0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e goerli testnet
// 0x62CAe0FA2da220f43a51F86Db2EDb36DcA9A5A08 arbitrum goerli testnet

// 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419 ethereum mainnet
// 0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612 arbitrum mainnet

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
