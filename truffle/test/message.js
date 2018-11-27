var Message = artifacts.require("MessageTest");
var helpers = require("./helpers/helpers");

const Web3 = require('web3')
const nodeUrl = `http://localhost:8545`
const web3 = new Web3(new Web3.providers.HttpProvider(nodeUrl))
const BN = small => new Eth.BN(small.toString(10), 10)

contract("Message", function(accounts) {
  var recipientAccount = accounts[0];
  var value = 1000000000000000000;
  var transactionHash = "0x1045bfe274b88120a6b1e5d01b5ec00ab5d01098346e90e7c7a3c9b8f0181c80";
  var mainGasPrice = 3000000000;
  var message = helpers.createMessage(recipientAccount, value, transactionHash, mainGasPrice);

  it("should extract value", function() {
    return Message.new().then(function(instance) {
      return instance.getValue.call(message)
    }).then(function(result) {
      assert(result.equals(value));
    })
  })

  it("should extract recipient", function() {
    return Message.new().then(function(instance) {
      return instance.getRecipient.call(message)
    }).then(function(result) {
      assert.equal(result, recipientAccount);
    })
  })

  it("should extract transactionHash", function() {
    return Message.new().then(function(instance) {
      return instance.getTransactionHash.call(message)
    }).then(function(result) {
      assert.equal(result, transactionHash);
    })
  })

  it("should extract mainGasPrice", function() {
    return Message.new().then(function(instance) {
      return instance.getMainGasPrice.call(message)
    }).then(function(result) {
      assert(result.equals(mainGasPrice));
    })
  })
})
