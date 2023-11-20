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

    const recipient = "0x0aeb5d4d291f70d24e5f3c40b4e86396b2b1c78741e6ba197f36d64053742654"; // replace it with your public key! Address convertation tool: https://polkadot.subscan.io/tools/format_transform?type=Public%20Key
    const amount = 100000000; // replace it with your withdraw amount! 1 DOT = 1000000000

    // Withdraw DOT tokens to Polkadot relaychain
    const tx = api.tx.eqBalances.xcmTransferNative(6582132, amount, {"Id32": recipient}, "SovereignAccWillPay");

    const ss58SignerAddress = encodeAddress(`0x${pubKey}`, api.registry.chainSS58);
    log(`Signer ss58 address: ${ss58SignerAddress}`);

    const signedTx = await signTransaction(app, api, tx, pubKey, ss58SignerAddress);

    log(`Signed tx as bytes: ${signedTx.toHex()}`);
    log(`Signed tx as json: ${JSON.stringify(signedTx.toHuman(), null, 2)}\n`)

    log(`Send signed tx to chain`)
    const submittedTxHash = (await tx.send()).toHex();

    log(`Submitted tx hash: ${submittedTxHash}`);
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
}

main();