var SideBridge = artifacts.require("SideBridge");
var helpers = require("./helpers/helpers");

contract('SideBridge', function(accounts) {
  it("should deploy contract", function() {
    var meta;
    var requiredSignatures = 1;
    var estimatedGasCostOfWithdraw = 0;
    var authorities = [accounts[0], accounts[1]];

    return SideBridge.new(requiredSignatures, authorities, estimatedGasCostOfWithdraw).then(function(instance) {
      meta = instance;

      return web3.eth.getTransactionReceipt(instance.transactionHash);
    }).then(function(transaction) {
      console.log("estimated gas cost of SideBridge deploy =", transaction.gasUsed);

      return meta.requiredSignatures.call();
    }).then(function(result) {
      assert.equal(requiredSignatures, result, "Contract has invalid number of requiredSignatures");

      return Promise.all(authorities.map((_, index) => meta.authorities.call(index)));
    }).then(function(result) {
      assert.deepEqual(authorities, result, "Contract has invalid authorities");

      return meta.isSideBridgeContract.call();
    }).then(function(result) {
      assert.equal(result, true)
    })
  })
/*
  it("should fail to deploy contract with not enough required signatures", function() {
    var authorities = [accounts[0], accounts[1]];
    return SideBridge.new(0, authorities, 0)
      .then(function() {
        assert(false, "Contract should fail to deploy");
      }, helpers.ignoreExpectedError)
  })

  it("should fail to deploy contract with to many signatures", function() {
    var authorities = [accounts[0], accounts[1]];
    return SideBridge.new(3, authorities, 0)
      .then(function() {
        assert(false, "Contract should fail to deploy");
      }, helpers.ignoreExpectedError)
  })
*/
  it("should allow a single authority to confirm a deposit", function() {
    var meta;
    var requiredSignatures = 1;
    var estimatedGasCostOfWithdraw = 0;
    var authorities = [accounts[0], accounts[1]];
    var userAccount = accounts[2];
    var value = 1000000000000000000;
    var hash = "0xe55bb43c36cdf79e23b4adc149cdded921f0d482e613c50c6540977c213bc408";

    return SideBridge.new(requiredSignatures, authorities, estimatedGasCostOfWithdraw).then(function(instance) {
      meta = instance;
      return meta.deposit(userAccount, value, hash, { from: authorities[0] });
    }).then(function(result) {
      assert.equal(2, result.logs.length)

      assert.equal("Transfer", result.logs[0].event);
      assert.equal("0x0000000000000000000000000000000000000000", result.logs[0].args.from);
      assert.equal(userAccount, result.logs[0].args.to);
      assert.equal(value, result.logs[0].args.tokens);

      assert.equal("Deposit", result.logs[1].event);
      assert.equal(userAccount, result.logs[1].args.recipient);
      assert.equal(value, result.logs[1].args.value);
      assert.equal(hash, result.logs[1].args.transactionHash);

      return meta.balances.call(userAccount);
    }).then(function(result) {
      assert.equal(value, result, "Contract balance should change");
    })
  })


  it("should require 2 authorities to complete deposit", function() {
    var meta;
    var requiredSignatures = 2;
    var estimatedGasCostOfWithdraw = 0;
    var authorities = [accounts[0], accounts[1]];
    var userAccount = accounts[2];
    var value = 1000000000000000000;
    var hash = "0xe55bb43c36cdf79e23b4adc149cdded921f0d482e613c50c6540977c213bc408";

    return SideBridge.new(requiredSignatures, authorities, estimatedGasCostOfWithdraw).then(function(instance) {
      meta = instance;

      return meta.hasAuthoritySignedMainToSide(authorities[0], userAccount, value, hash, { from: userAccount });
    }).then(function(result) {
      assert.equal(result, false)

      return meta.deposit(userAccount, value, hash, { from: authorities[0] });
    }).then(function(result) {
      assert.equal(1, result.logs.length);

      assert.equal("DepositConfirmation", result.logs[0].event);
      assert.equal(userAccount, result.logs[0].args.recipient);
      assert.equal(value, result.logs[0].args.value);
      assert.equal(hash, result.logs[0].args.transactionHash);

      return meta.hasAuthoritySignedMainToSide(authorities[0], userAccount, value, hash, { from: userAccount });
    }).then(function(result) {
      assert.equal(result, true)

      return meta.balances.call(userAccount);
    }).then(function(result) {
      assert.equal(0, result, "Contract balance should not change yet");

      return meta.deposit.estimateGas(userAccount, value, hash, { from: authorities[1] });
    }).then(function(result) {
      console.log("estimated gas cost of SideBridge.deposit =", result);

      return meta.hasAuthoritySignedMainToSide(authorities[1], userAccount, value, hash, { from: userAccount });
    }).then(function(result) {
      assert.equal(result, false)

      return meta.deposit(userAccount, value, hash, { from: authorities[1] });
    }).then(function(result) {
      assert.equal(2, result.logs.length)

      assert.equal("Transfer", result.logs[0].event);
      assert.equal("0x0000000000000000000000000000000000000000", result.logs[0].args.from);
      assert.equal(userAccount, result.logs[0].args.to);
      assert.equal(value, result.logs[0].args.tokens);

      assert.equal("Deposit", result.logs[1].event, "Event name should be Deposit");
      assert.equal(userAccount, result.logs[1].args.recipient, "Event recipient should be transaction sender");
      assert.equal(value, result.logs[1].args.value, "Event value should match deposited ether");
      assert.equal(hash, result.logs[1].args.transactionHash);

      return meta.hasAuthoritySignedMainToSide(authorities[1], userAccount, value, hash, { from: userAccount });
    }).then(function(result) {
      assert.equal(result, true)

      return meta.balances.call(userAccount);
    }).then(function(result) {
      assert.equal(value, result, "Contract balance should change");
    })
  })
/*
  it("should not be possible to do same deposit twice for same authority", function() {
    var meta;
    var requiredSignatures = 1;
    var estimatedGasCostOfWithdraw = 0;
    var authorities = [accounts[0], accounts[1]];
    var userAccount = accounts[2];
    var value = web3.toWei(1, "ether");
    var hash = "0xe55bb43c36cdf79e23b4adc149cdded921f0d482e613c50c6540977c213bc408";

    return SideBridge.new(requiredSignatures, authorities, estimatedGasCostOfWithdraw).then(function(instance) {
      meta = instance;
      return meta.deposit(userAccount, value, hash, { from: authorities[0] });
    }).then(function(_) {
      return meta.deposit(userAccount, value, hash, { from: authorities[0] })
        .then(function() {
          assert(false, "doing same deposit twice from same authority should fail");
        }, helpers.ignoreExpectedError)
    })
  })

  it("should not allow non-authorities to execute deposit", function() {
    var meta;
    var requiredSignatures = 1;
    var estimatedGasCostOfWithdraw = 0;
    var authorities = [accounts[0], accounts[1]];
    var userAccount = accounts[2];
    var value = web3.toWei(1, "ether");
    var hash = "0xe55bb43c36cdf79e23b4adc149cdded921f0d482e613c50c6540977c213bc408";

    return SideBridge.new(requiredSignatures, authorities, estimatedGasCostOfWithdraw).then(function(instance) {
      meta = instance;
      return meta.deposit(userAccount, value, hash, { from: userAccount })
        .then(function() {
          assert(false, "should fail");
        }, helpers.ignoreExpectedError)
    })
  })

  it("should ignore misbehaving authority when confirming deposit", function() {
    var meta;
    var requiredSignatures = 2;
    var estimatedGasCostOfWithdraw = 0;
    var authorities = [accounts[0], accounts[1], accounts[2]];
    var userAccount = accounts[3];
    var invalidValue = web3.toWei(2, "ether");
    var value = web3.toWei(1, "ether");
    var hash = "0xe55bb43c36cdf79e23b4adc149cdded921f0d482e613c50c6540977c213bc408";

    return SideBridge.new(requiredSignatures, authorities, estimatedGasCostOfWithdraw).then(function(instance) {
      meta = instance;
      return meta.deposit(userAccount, value, hash, { from: authorities[0] });
    }).then(function(result) {
      assert.equal(1, result.logs.length);

      assert.equal("DepositConfirmation", result.logs[0].event);
      assert.equal(userAccount, result.logs[0].args.recipient);
      assert.equal(value, result.logs[0].args.value);
      assert.equal(hash, result.logs[0].args.transactionHash);

      return meta.deposit(userAccount, invalidValue, hash, { from: authorities[1] });
    }).then(function(result) {
      assert.equal("DepositConfirmation", result.logs[0].event);
      assert.equal(userAccount, result.logs[0].args.recipient);
      assert.equal(invalidValue, result.logs[0].args.value);
      assert.equal(hash, result.logs[0].args.transactionHash);

      return meta.deposit(userAccount, value, hash, { from: authorities[2] })
    }).then(function(result) {
      assert.equal(2, result.logs.length)

      assert.equal("Transfer", result.logs[0].event);
      assert.equal("0x0000000000000000000000000000000000000000", result.logs[0].args.from);
      assert.equal(userAccount, result.logs[0].args.to);
      assert.equal(value, result.logs[0].args.tokens);

      assert.equal("Deposit", result.logs[1].event, "Event name should be Deposit");
      assert.equal(userAccount, result.logs[1].args.recipient, "Event recipient should be transaction sender");
      assert.equal(value, result.logs[1].args.value, "Event value should match transaction value");
      assert.equal(hash, result.logs[1].args.transactionHash);

      return meta.balances.call(userAccount);
    }).then(function(result) {
      assert.equal(value, result, "Contract balance should change");
    })
  })

  it("should not allow user to transfer value they don't have to main", function() {
    var meta;
    var requiredSignatures = 1;
    var estimatedGasCostOfWithdraw = 0;
    var authorities = [accounts[0], accounts[1]];
    var userAccount = accounts[2];
    var mainGasPrice = web3.toBigNumber(10000);
    var recipientAccount = accounts[3];
    var userValue = web3.toWei(3, "ether");
    var transferedValue = web3.toWei(4, "ether");
    var hash = "0xe55bb43c36cdf79e23b4adc149cdded921f0d482e613c50c6540977c213bc408";
    return SideBridge.new(requiredSignatures, authorities, estimatedGasCostOfWithdraw).then(function(instance) {
      meta = instance;
      return meta.deposit(userAccount, userValue, hash, { from: authorities[0] });
    }).then(function(result) {
      return meta.transferToMainViaRelay(recipientAccount, transferedValue, mainGasPrice, { from: userAccount })
        .then(function() {
          assert(false, "transferToMainViaRelay should fail");
        }, helpers.ignoreExpectedError)
    })
  })

  it("should fail to transfer 0 value to main", function() {
    var meta;
    var requiredSignatures = 1;
    var estimatedGasCostOfWithdraw = 0;
    var authorities = [accounts[0], accounts[1]];
    var userAccount = accounts[2];
    var mainGasPrice = web3.toBigNumber(10000);
    var recipientAccount = accounts[3];
    var userValue = web3.toWei(3, "ether");
    var transferedValue = web3.toWei(0, "ether");
    var hash = "0xe55bb43c36cdf79e23b4adc149cdded921f0d482e613c50c6540977c213bc408";
    return SideBridge.new(requiredSignatures, authorities, estimatedGasCostOfWithdraw).then(function(instance) {
      meta = instance;
      return meta.deposit(userAccount, userValue, hash, { from: authorities[0] });
    }).then(function(result) {
      return meta.transferToMainViaRelay(recipientAccount, transferedValue, mainGasPrice, { from: userAccount })
        .then(function() {
          assert(false, "transferToMainViaRelay should fail");
        }, helpers.ignoreExpectedError)
    })
  })

  it("should fail to transfer more than balance main", function() {
    var meta;
    var requiredSignatures = 1;
    var estimatedGasCostOfWithdraw = 0;
    var authorities = [accounts[0], accounts[1]];
    var userAccount = accounts[2];
    var mainGasPrice = web3.toBigNumber(10000);
    var recipientAccount = accounts[3];
    var userValue = web3.toWei(3, "ether");
    var transferedValue = web3.toWei(4, "ether");
    var hash = "0xe55bb43c36cdf79e23b4adc149cdded921f0d482e613c50c6540977c213bc408";
    return SideBridge.new(requiredSignatures, authorities, estimatedGasCostOfWithdraw).then(function(instance) {
      meta = instance;
      return meta.deposit(userAccount, userValue, hash, { from: authorities[0] });
    }).then(function(result) {
      return meta.transferToMainViaRelay(recipientAccount, transferedValue, mainGasPrice, { from: userAccount })
        .then(function() {
          assert(false, "transferToMainViaRelay should fail");
        }, helpers.ignoreExpectedError)
    })
  })

  it("should fail to transfer main with value that gets entirely burned on gas", function() {
    var meta;
    var requiredSignatures = 1;
    var estimatedGasCostOfWithdraw = web3.toBigNumber(10000);
    var authorities = [accounts[0], accounts[1]];
    var userAccount = accounts[2];
    var mainGasPrice = web3.toBigNumber(10000);
    var recipientAccount = accounts[3];
    var userValue = web3.toWei(3, "ether");
    var transferedValue = estimatedGasCostOfWithdraw.times(mainGasPrice);
    var hash = "0xe55bb43c36cdf79e23b4adc149cdded921f0d482e613c50c6540977c213bc408";
    return SideBridge.new(requiredSignatures, authorities, estimatedGasCostOfWithdraw).then(function(instance) {
      meta = instance;
      return meta.deposit(userAccount, userValue, hash, { from: authorities[0] });
    }).then(function(result) {
      return meta.transferToMainViaRelay(recipientAccount, transferedValue, mainGasPrice, { from: userAccount })
        .then(function() {
          assert(false, "transferToMainViaRelay should fail");
        }, helpers.ignoreExpectedError)
    })
  })
*/
  it("should allow user to transfer to main", function() {
    var meta;
    var requiredSignatures = 1;
    var estimatedGasCostOfWithdraw = web3.utils.toBN(10000);
    var authorities = [accounts[0], accounts[1]];
    var userAccount = accounts[2];
    var userAccount2 = accounts[3];
    var value = 3000000000000000000;
    var mainGasPrice = 3000000000;
    var transferedValue = estimatedGasCostOfWithdraw * (mainGasPrice) + (1);
    var hash = "0xe55bb43c36cdf79e23b4adc149cdded921f0d482e613c50c6540977c213bc408";
    return SideBridge.new(requiredSignatures, authorities, estimatedGasCostOfWithdraw).then(function(instance) {
      meta = instance;
      // top up balance so we can transfer
      return meta.deposit(userAccount, value, hash, { from: authorities[0] });
    }).then(function(result) {
      return meta.transferToMainViaRelay(userAccount2, transferedValue, mainGasPrice, { from: userAccount });
    }).then(function(result) {
      assert.equal(2, result.logs.length)

      assert.equal("Transfer", result.logs[0].event);
      assert.equal(userAccount, result.logs[0].args.from);
      assert.equal("0x0000000000000000000000000000000000000000", result.logs[0].args.to);
      assert(transferedValue == result.logs[0].args.tokens);

      assert.equal("Withdraw", result.logs[1].event, "Event name should be Withdraw");
      assert.equal(userAccount2, result.logs[1].args.recipient, "Event recipient should be equal to transaction recipient");
      assert(transferedValue == result.logs[1].args.value);
      assert(mainGasPrice == result.logs[1].args.mainGasPrice);

      return Promise.all([
        meta.balances.call(userAccount),
        meta.balances.call(userAccount2)
      ])
    }).then(function(result) {
      assert((web3.utils.toBN(value) - transferedValue) == (result[0]));
      assert(result[1] == 0);
    })
  })

  it("should successfully submit signature and trigger CollectedSignatures event", function() {
    var meta;
    var signature;
    var requiredSignatures = 1;
    var estimatedGasCostOfWithdraw = 0;
    var authorities = [accounts[0], accounts[1]];
    var recipientAccount = accounts[2];
    var transactionHash = "0x1045bfe274b88120a6b1e5d01b5ec00ab5d01098346e90e7c7a3c9b8f0181c80";
    var mainGasPrice = web3.utils.toBN(3000000000);
    var message = helpers.createMessage(recipientAccount, web3.utils.toBN(1000), transactionHash, mainGasPrice);
    return SideBridge.new(requiredSignatures, authorities, estimatedGasCostOfWithdraw).then(function(instance) {
      meta = instance;

      return meta.hasAuthoritySignedSideToMain(authorities[0], message);
    }).then(function(result) {
      assert.equal(result, false)

      return helpers.sign(authorities[0], message);
    }).then(function(result) {
      signature = result;

      return meta.submitSignature(result, message, { from: authorities[0] });
    }).then(function(result) {
      assert.equal(1, result.logs.length, "Exactly one event should be created");
      assert.equal("CollectedSignatures", result.logs[0].event, "Event name should be CollectedSignatures");
      assert.equal(authorities[0], result.logs[0].args.authorityResponsibleForRelay, "Event authority should be equal to transaction sender");

      return Promise.all([
        meta.signature.call(result.logs[0].args.messageHash, 0),
        meta.message(result.logs[0].args.messageHash),
      ])
    }).then(function(result) {
      assert.equal(signature, result[0]);
      assert.equal(message.toLowerCase(), result[1]);

      return meta.hasAuthoritySignedSideToMain(authorities[0], message);
    }).then(function(result) {
      assert.equal(result, true)
    })
  })
/*
  it("should successfully submit signature but not trigger CollectedSignatures event", function() {
    var meta;
    var requiredSignatures = 2;
    var estimatedGasCostOfWithdraw = 0;
    var authorities = [accounts[0], accounts[1]];
    var recipientAccount = accounts[2];
    var transactionHash = "0x1045bfe274b88120a6b1e5d01b5ec00ab5d01098346e90e7c7a3c9b8f0181c80";
    var mainGasPrice = web3.toBigNumber(web3.toWei(3, "gwei"));
    var message = helpers.createMessage(recipientAccount, web3.toBigNumber(1000), transactionHash, mainGasPrice);
    var signature;

    return SideBridge.new(requiredSignatures, authorities, estimatedGasCostOfWithdraw).then(function(instance) {
      meta = instance;

      return helpers.sign(authorities[0], message);
    }).then(function(result) {
      signature = result;

      return meta.submitSignature.estimateGas(result, message, { from: authorities[0] });
    }).then(function(result) {
      console.log("estimated gas cost of SideBridge.submitSignature =", result);

      return meta.hasAuthoritySignedSideToMain(authorities[0], message);
    }).then(function(result) {
      assert.equal(result, false)

      return meta.submitSignature(signature, message, { from: authorities[0] });
    }).then(function(result) {
      assert.equal(1, result.logs.length, "Exactly one event should be created");
      assert.equal("WithdrawSignatureSubmitted", result.logs[0].event);

      return meta.signature.call(result.logs[0].args.messageHash, 0);
    }).then(function(result) {
      assert.equal(signature, result);

      return meta.hasAuthoritySignedSideToMain(authorities[0], message);
    }).then(function(result) {
      assert.equal(result, true)
    })
  })

  it("should be able to collect signatures for multiple events in parallel", function() {
    var meta;
    var signatures_for_message = [];
    var signatures_for_message2 = [];
    var requiredSignatures = 2;
    var estimatedGasCostOfWithdraw = 0;
    var authorities = [accounts[0], accounts[1]];
    var recipientAccount = accounts[2];
    var transactionHash = "0x1045bfe274b88120a6b1e5d01b5ec00ab5d01098346e90e7c7a3c9b8f0181c80";
    var mainGasPrice = web3.toBigNumber(web3.toWei(3, "gwei"));
    var message = helpers.createMessage(recipientAccount, web3.toBigNumber(1000), transactionHash, mainGasPrice);
    var message2 = helpers.createMessage(recipientAccount, web3.toBigNumber(2000), transactionHash, mainGasPrice);
    return SideBridge.new(requiredSignatures, authorities, estimatedGasCostOfWithdraw).then(function(instance) {
      meta = instance;
      return Promise.all([
        helpers.sign(authorities[0], message),
        helpers.sign(authorities[1], message),
        helpers.sign(authorities[0], message2),
        helpers.sign(authorities[1], message2),
      ]);
    }).then(function(result) {
      signatures_for_message.push(result[0]);
      signatures_for_message.push(result[1]);
      signatures_for_message2.push(result[2]);
      signatures_for_message2.push(result[3]);
      return meta.submitSignature(signatures_for_message[0], message, { from: authorities[0] });
    }).then(function(result) {
      assert.equal(1, result.logs.length, "Exactly one event should be created");
      assert.equal("WithdrawSignatureSubmitted", result.logs[0].event);

      return meta.submitSignature(signatures_for_message2[1], message2, { from: authorities[1] });
    }).then(function(result) {
      assert.equal(1, result.logs.length, "Exactly one event should be created");
      assert.equal("WithdrawSignatureSubmitted", result.logs[0].event);

      return meta.submitSignature(signatures_for_message2[0], message2, { from: authorities[0] });
    }).then(function(result) {
      assert.equal(1, result.logs.length, "Exactly one event should be created");
      assert.equal("CollectedSignatures", result.logs[0].event, "Event name should be CollectedSignatures");
      assert.equal(authorities[0], result.logs[0].args.authorityResponsibleForRelay, "Event authority should be equal to transaction sender");
      return Promise.all([
        meta.signature.call(result.logs[0].args.messageHash, 0),
        meta.signature.call(result.logs[0].args.messageHash, 1),
        meta.message(result.logs[0].args.messageHash),
      ])
    }).then(function(result) {
      assert.equal(signatures_for_message2[1], result[0]);
      assert.equal(signatures_for_message2[0], result[1]);
      assert.equal(message2, result[2]);
      return meta.submitSignature(signatures_for_message[1], message, { from: authorities[1] });
    }).then(function(result) {
      assert.equal(1, result.logs.length, "Exactly one event should be created");
      assert.equal("CollectedSignatures", result.logs[0].event, "Event name should be CollectedSignatures");
      assert.equal(authorities[1], result.logs[0].args.authorityResponsibleForRelay, "Event authority should be equal to transaction sender");
      return Promise.all([
        meta.signature.call(result.logs[0].args.messageHash, 0),
        meta.signature.call(result.logs[0].args.messageHash, 1),
        meta.message(result.logs[0].args.messageHash),
      ])
    }).then(function(result) {
      assert.equal(signatures_for_message[0], result[0]);
      assert.equal(signatures_for_message[1], result[1]);
      assert.equal(message, result[2]);
    })
  })

  it("should not be possible to submit message that is too short", function() {
    var meta;
    var requiredSignatures = 1;
    var estimatedGasCostOfWithdraw = 0;
    var authorities = [accounts[0], accounts[1]];
    var recipientAccount = accounts[2];
    var transactionHash = "0x1045bfe274b88120a6b1e5d01b5ec00ab5d01098346e90e7c7a3c9b8f0181c80";
    var mainGasPrice = web3.toBigNumber(web3.toWei(3, "gwei"));
    var message = helpers.createMessage(recipientAccount, web3.toBigNumber(1000), transactionHash, mainGasPrice);
    var truncatedMessage = message.substr(0, 84);
    return SideBridge.new(requiredSignatures, authorities, estimatedGasCostOfWithdraw).then(function(instance) {
      meta = instance;
      return helpers.sign(authorities[0], truncatedMessage);
    }).then(function(signature) {
      return meta.submitSignature(signature, truncatedMessage, { from: authorities[0] })
        .then(function() {
          assert(false, "submitSignature should fail for message that is too short");
        }, helpers.ignoreExpectedError)
    })
  })

  it("should not be possible to submit different message then the signed one", function() {
    var meta;
    var requiredSignatures = 1;
    var estimatedGasCostOfWithdraw = 0;
    var authorities = [accounts[0], accounts[1]];
    var recipientAccount = accounts[2];
    var transactionHash = "0x1045bfe274b88120a6b1e5d01b5ec00ab5d01098346e90e7c7a3c9b8f0181c80";
    var mainGasPrice = web3.toBigNumber(web3.toWei(3, "gwei"));
    var mainGasPrice2 = web3.toBigNumber(web3.toWei(2, "gwei"));
    var message = helpers.createMessage(recipientAccount, web3.toBigNumber(1000), transactionHash, mainGasPrice);
    var message2 = helpers.createMessage(recipientAccount, web3.toBigNumber(1000), transactionHash, mainGasPrice2);
    return SideBridge.new(requiredSignatures, authorities, estimatedGasCostOfWithdraw).then(function(instance) {
      meta = instance;
      return helpers.sign(authorities[0], message);
    }).then(function(result) {
      return meta.submitSignature(result, message2, { from: authorities[0] })
        .then(function() {
          assert(false, "submitSignature should fail");
        }, helpers.ignoreExpectedError)
    })
  })

  it("should not be possible to submit signature signed by different authority", function() {
    var meta;
    var requiredSignatures = 1;
    var estimatedGasCostOfWithdraw = 0;
    var authorities = [accounts[0], accounts[1]];
    var recipientAccount = accounts[2];
    var transactionHash = "0x1045bfe274b88120a6b1e5d01b5ec00ab5d01098346e90e7c7a3c9b8f0181c80";
    var mainGasPrice = web3.toBigNumber(web3.toWei(3, "gwei"));
    var mainGasPrice2 = web3.toBigNumber(web3.toWei(2, "gwei"));
    var message = helpers.createMessage(recipientAccount, web3.toBigNumber(1000), transactionHash, mainGasPrice);
    var message2 = helpers.createMessage(recipientAccount, web3.toBigNumber(1000), transactionHash, mainGasPrice2);
    return SideBridge.new(requiredSignatures, authorities, estimatedGasCostOfWithdraw).then(function(instance) {
      meta = instance;
      return helpers.sign(authorities[0], message);
    }).then(function(result) {
      return meta.submitSignature(result, message, { from: authorities[1] })
        .then(function() {
          assert(false, "submitSignature should fail");
        }, helpers.ignoreExpectedError)
    })
  })

  it("should not be possible to submit signature twice", function() {
    var meta;
    var requiredSignatures = 1;
    var estimatedGasCostOfWithdraw = 0;
    var authorities = [accounts[0], accounts[1]];
    var recipientAccount = accounts[2];
    var transactionHash = "0x1045bfe274b88120a6b1e5d01b5ec00ab5d01098346e90e7c7a3c9b8f0181c80";
    var mainGasPrice = web3.toBigNumber(web3.toWei(3, "gwei"));
    var message = helpers.createMessage(recipientAccount, web3.toBigNumber(1000), transactionHash, mainGasPrice);
    var signature;
    return SideBridge.new(requiredSignatures, authorities, estimatedGasCostOfWithdraw).then(function(instance) {
      meta = instance;
      return helpers.sign(authorities[0], message);
    }).then(function(result) {
      signature = result;
      return meta.submitSignature(signature, message, { from: authorities[0] });
    }).then(function(_) {
      return meta.submitSignature(signature, message, { from: authorities[0] })
        .then(function() {
          assert(false, "submitSignature should fail");
        }, helpers.ignoreExpectedError)
    })
  })

  it("should fail if hasAuthoritySignedSideToMain called with too short a message", function() {
    var meta;
    var signature;
    var requiredSignatures = 1;
    var estimatedGasCostOfWithdraw = 0;
    var authorities = [accounts[0], accounts[1]];
    var recipientAccount = accounts[2];
    var transactionHash = "0x1045bfe274b88120a6b1e5d01b5ec00ab5d01098346e90e7c7a3c9b8f0181c80";
    var mainGasPrice = web3.toBigNumber(web3.toWei(3, "gwei"));
    var message = helpers.createMessage(recipientAccount, web3.toBigNumber(1000), transactionHash, mainGasPrice);
    return SideBridge.new(requiredSignatures, authorities, estimatedGasCostOfWithdraw).then(function(instance) {
      meta = instance;

      return meta.hasAuthoritySignedSideToMain(authorities[0], message.substr(0, 83))
    }).then(function() {
        assert(false, "should fail");
    }, helpers.ignoreExpectedError)
  })
  */
})
