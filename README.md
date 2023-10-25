# Invest AI Smart Contracts

## How to compile

```
hardhat compile
```

## How to deploy

```
hardhat --network mainnet deploy
```

deployment(check price seed address)
```
npx hardhat run --network goerli scripts/deploy.ts
```
contract verify
```
 npx hardhat verify --network arbitrumGoerli <saleContractAddress> <priceSeed>
```
