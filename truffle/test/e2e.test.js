var MainBridge = artifacts.require("MainBridge");
var SideBridge = artifacts.require("SideBridge");
var helpers = require("./helpers/helpers");

const Web3 = require('web3')
const nodeUrl = `http://localhost:8545`
const web3 = new Web3(new Web3.providers.HttpProvider(nodeUrl))
const BN = small => new Eth.BN(small.toString(10), 10)

function newMainBridge(options) {
  if (options.estimatedGasCostOfWithdraw === undefined) {
    options.estimatedGasCostOfWithdraw = 0;
  }
  if (options.maxTotalMainContractBalance === undefined) {
    options.maxTotalMainContractBalance = 0;
  }
  if (options.maxSingleDepositValue === undefined) {
    options.maxSingleDepositValue = 0;
  }
  return MainBridge.new(
    options.requiredSignatures,
    options.authorities,
    options.estimatedGasCostOfWithdraw,
    options.maxTotalMainContractBalance,
    options.maxSingleDepositValue
  )
}


contract('Bridge', (accounts) => {
    describe('Test Bridge', () => {
        it('Should transfer from main network (ether) to side network (erc20)', async () => {
          var estimatedGasCostOfWithdraw = 0;
          var authorities = [accounts[0], accounts[1]];
          var mainrequiredSignatures = 1;
          var siderequiredSignatures = 1;

          // deploy main bridge
          const mainBridge = await newMainBridge({requiredSignatures: mainrequiredSignatures, authorities: authorities,})
          // deploy side bridge
          const sideBridge = await SideBridge.new(siderequiredSignatures, authorities, estimatedGasCostOfWithdraw)

          console.log(`------ tx in main Bridge -------`)
          // user sends 1 Ether to main bridge (in order to withdraw from main network and deposit into side network)
          let value = 1000000000000000000;  // 1 ether
          let userAccount = accounts[2];
          // user depsoit 1 ether to main bridge contract
          let result = await mainBridge.sendTransaction({value: value, from: userAccount})
          console.log(`deposit into main bridge (tx hash): ${result.logs[0].transactionHash}`)
          console.log(``)
          // authority assembles message
          var recipientAccount = accounts[3];
          var mainGasPrice = web3.utils.toBN(0);
          var transactionHash = result.logs[0].transactionHash
          // authority designates the recepient account of ether withdraw
          var message = helpers.createMessage(recipientAccount, value, transactionHash, mainGasPrice);
          console.log(`message to be signed by authority is (recipientAccount, value, transactionHash, mainGasPrice):`)
          console.log(`\t ${message}`)
          console.log(``)
          // generate signature
          let signature = await helpers.sign(accounts[0], message, {from: accounts[0]});
          console.log(`signature := ${signature}`)
          // split signature
          var vrs = await helpers.signatureToVRS(signature);
          // sender submit the signature from the authority - withdraw 1 ether from main bridge contract to recepient
          await mainBridge.withdraw([vrs.v], [vrs.r], [vrs.s], message, {from: userAccount, gasPrice: mainGasPrice});
          console.log(`user withdraw Ether funds into the escrow account set by auhority`)

          //let bal1 = await web3.eth.getBalance(mainBridge.address)
          //console.log(web3.utils.toBN(bal1) / 1000000000000000000)
          //let bal2 = await web3.eth.getBalance(recipientAccount)
          //console.log(web3.utils.toBN(bal2) / 1000000000000000000)

          console.log(``)
          console.log(`------ tx in side Bridge -------`)
          // authority mint ERC20 tokens in side chain for user
          var hash = "0xe55bb43c36cdf79e23b4adc149cdded921f0d482e613c50c6540977c213bc408";
          let userBalance = await sideBridge.balances.call(userAccount);
          console.log(`before main2side transfer: userAccount has balance := ${userBalance} on sideBridge`)
          await sideBridge.deposit(userAccount, 3000000000000000000, hash, {from: authorities[0]});
          console.log(`authority (offchain bridge) makes deposit of ERC20 tokens`)
          userBalance = await sideBridge.balances.call(userAccount);
          console.log(`after main2side transfer: userAccount has balance := ${userBalance} on sideBridge`)

    })
  })
})
