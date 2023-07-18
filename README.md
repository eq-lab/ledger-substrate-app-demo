# Ledger substrate common app demo
This repository contains a demo for [common Ledger app](https://github.com/eq-lab/app-substrate-common/tree/poc) (`poc` tag)
that can be used to sign tx on any parachain/relaychain 
where ed25519 signature is accepted.

## Run demo
To run this demo you need:
1. install this demo dependencies:
```bash
yarn install
```
2. install ledger tools [dependencies](https://github.com/eq-lab/app-substrate-common/blob/master/docs/build.md)
3. load app to your Ledger:
- Ledger Nano S:
```bash
app/installer_s.sh load
```
- Ledger Nano S Plus:
```bash
app/installer_s2.sh load
```
- Ledger Nano X and Ledger Stax are not support load custom apps.
4. run demo script:
```bash
yarn build && yarn start
```


## Example of execution
File `Example.md` contains an example of running this demo on Ledger Nano S 
with transfers on Equilibrium, Bifrost(Kusama), and Khala mainnets, 
screenshots, and logs with Subscan links
