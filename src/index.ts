import { newSubstrateApp, SubstrateApp } from '@zondax/ledger-substrate';
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import { SignerPayload, ExtrinsicEra } from '@polkadot/types/interfaces';
import { GenericExtrinsic } from '@polkadot/types/extrinsic';
const blake2b = require('blake2b');
import { signatureVerify } from '@polkadot/util-crypto';

import {ApiPromise, WsProvider} from "@polkadot/api";
const { encodeAddress } = require("@polkadot/keyring");

import { SubmittableExtrinsic } from "@polkadot/api/promise/types";

const hdPathAccount = 0x80000000;
const hdPathChange = 0x80000000;
const hdPathIndex = 0x80000000;

const nodeEquilibrium = "wss://node.pol.equilibrium.io/";
const nodeBifrostKsm = "wss://bifrost-rpc.dwellir.com";
const nodeKhala = "wss://khala-api.phala.network/ws";

const log = (...v: any[]) => console.log(...v);

async function signTransaction(
    app: SubstrateApp,
    api: ApiPromise,
    tx: SubmittableExtrinsic,
    signerPublicKey: string,
    signerAddress: string
): Promise<GenericExtrinsic> {
    const finalizedBlock = await api.rpc.chain.getBlock();
    const currentHeight = finalizedBlock.block.header.number;

    // @ts-ignore
    const nonce = (await api.query.system.account(signerAddress)).nonce;
    const exERA = api.registry.createTypeUnsafe<ExtrinsicEra>('ExtrinsicEra', [{ current: currentHeight, period: 8 }]);

    const signerPayload = api.registry.createTypeUnsafe<SignerPayload>('SignerPayload', [{
        address: signerAddress,
        blockHash: finalizedBlock.block.hash,
        blockNumber: currentHeight,
        era: exERA,
        genesisHash: api.genesisHash,
        method: tx,
        nonce: nonce,
        runtimeVersion: api.runtimeVersion,
        tip: 0,
        version: api.extrinsicVersion
    }]);

    const output = new Uint8Array(32);
    const dataToSign = Buffer.from(signerPayload.toRaw().data.slice(2), 'hex');
    log(`Tx hash: 0x${blake2b(output.length).update(dataToSign).digest('hex')}. Check it on Ledger!`);

    const responseSign = await app.sign(hdPathAccount, hdPathChange, hdPathIndex, dataToSign);
    const sign = {...responseSign, signature: responseSign.signature.toString('hex')};

    log(`Ledger response: ${JSON.stringify(sign, null, 2)}`);

    const signatureValidity = signatureVerify(signerPayload.toRaw().data, `0x${sign.signature}`, `0x${signerPublicKey}`);
    log(`Signature is valid: ${signatureValidity.isValid}\n`)

    return tx.addSignature(signerAddress,
        `0x${sign.signature}`,
        signerPayload.toPayload()
    );
}

async function signAndSendEquilibriumTx(app: SubstrateApp, pubKey: string){
    log(`\nSign transaction on Equilibrium\n`);

    const api = await ApiPromise.create({
        provider: new WsProvider(nodeEquilibrium),
        throwOnConnect: true,
    });

    // Transfer 1.0 EQ to cg4q1NRDwhj1ocFmfnJubbSxekchEdDXBc95KCQxHdzfVcBtL
    const tx = api.tx.eqBalances.transfer(25969, "cg4q1NRDwhj1ocFmfnJubbSxekchEdDXBc95KCQxHdzfVcBtL", 1000000000);

    const ss58SignerAddress = encodeAddress(`0x${pubKey}`, api.registry.chainSS58);
    log(`Signer ss58 address: ${ss58SignerAddress}`);

    const signedTx = await signTransaction(app, api, tx, pubKey, ss58SignerAddress);

    log(`Signed tx as bytes: ${signedTx.toHex()}`);
    log(`Signed tx as json: ${JSON.stringify(signedTx.toHuman(), null, 2)}\n`)

    log(`Send signed tx to chain`)
    const submittedTxHash = (await tx.send()).toHex();

    log(`Submitted tx hash: ${submittedTxHash}`)
    log(`Subscan link: https://equilibrium.subscan.io/extrinsic/${submittedTxHash} (please wait 1 minute to processing)`)
}

async function signAndSendBifrostKsmTx(app: SubstrateApp, pubKey: string){
    log(`\nSign transaction on Bifrost (Kusama)\n`);

    const api = await ApiPromise.create({
        provider: new WsProvider(nodeBifrostKsm),
        throwOnConnect: true,
    });

    // Transfer 0.01 BNC to dStzKJ4cWYbuRTByUKDpssj1vHat2bMHnuXRR2mGCKKW6Lh
    const tx = api.tx.balances.transfer({"id": "dStzKJ4cWYbuRTByUKDpssj1vHat2bMHnuXRR2mGCKKW6Lh"}, 10000000000);

    const ss58SignerAddress = encodeAddress(`0x${pubKey}`, api.registry.chainSS58);
    log(`Signer ss58 address: ${ss58SignerAddress}`);

    const signedTx = await signTransaction(app, api, tx, pubKey, ss58SignerAddress);

    log(`Signed tx as bytes: ${signedTx.toHex()}`);
    log(`Signed tx as json: ${JSON.stringify(signedTx.toHuman(), null, 2)}\n`)

    log(`Send signed tx to chain`)
    const submittedTxHash = (await tx.send()).toHex();

    log(`Submitted tx hash: ${submittedTxHash}`)
    log(`Subscan link: https://bifrost-kusama.subscan.io/extrinsic/${submittedTxHash} (please wait 1 minute to processing)`)
}

async function signAndSendKhalaTx(app: SubstrateApp, pubKey: string){
    log(`\nSign transaction on Khala\n`);

    const api = await ApiPromise.create({
        provider: new WsProvider(nodeKhala),
        throwOnConnect: true,
    });

    // Transfer 0.01 PHA to 42LjC8HjqVY3eqAKiFRntWFvXZieCRhqpNCgBpTzNib2G3Wo
    const tx = api.tx.balances.transfer({"id": "42LjC8HjqVY3eqAKiFRntWFvXZieCRhqpNCgBpTzNib2G3Wo"}, 10000000000);

    const ss58SignerAddress = encodeAddress(`0x${pubKey}`, api.registry.chainSS58);
    log(`Signer ss58 address: ${ss58SignerAddress}`);

    const signedTx = await signTransaction(app, api, tx, pubKey, ss58SignerAddress);

    log(`Signed tx as bytes: ${signedTx.toHex()}`);
    log(`Signed tx as json: ${JSON.stringify(signedTx.toHuman(), null, 2)}\n`)

    log(`Send signed tx to chain`)
    const submittedTxHash = (await tx.send()).toHex();

    log(`Submitted tx hash: ${submittedTxHash}`)
    log(`Subscan link: https://khala.subscan.io/extrinsic/${submittedTxHash} (please wait 1 minute to processing)`)
}

async function main() {
    const transport = await TransportNodeHid.create(1000);
    const app = newSubstrateApp(transport, "Polkadot");

    log(`Getting information from Ledger`)
    const version = await app.getVersion();
    log(`App version: ${JSON.stringify(version, null, 2)}`);

    const address = await app.getAddress(hdPathAccount, hdPathChange, hdPathIndex)
    log(`Ledger account: ${JSON.stringify(address, null, 2)}`);

    await signAndSendEquilibriumTx(app, address.pubKey);
    await signAndSendBifrostKsmTx(app, address.pubKey);
    await signAndSendKhalaTx(app, address.pubKey);
}

main();