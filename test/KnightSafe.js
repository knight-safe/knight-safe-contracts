const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const addressZero = "0x0000000000000000000000000000000000000000";
const addressOne = "0x0000000000000000000000000000000000000001";

async function deployMasterCopy() {
    const [owner, trader, otherAddr1] = await ethers.getSigners();

    const masterCopy = await ethers.deployContract("KnightSafe");
    
    return {masterCopy, owner, trader, otherAddr1};
}

async function deployProxyFactory() {
    const proxyFactory = await ethers.deployContract("KnightSafeProxyFactory");

    return {proxyFactory};
}

async function deployTestParameterChecker() {
    const testParameterChecker = await ethers.deployContract("TestParameterChecker");

    return {testParameterChecker};
}
async function deployGmxTradeParameterChecker() {
    const gmxTradeChecker = await ethers.deployContract("GmxTradeParameterChecker");
    
    return {gmxTradeChecker};
}
async function deployAaveLendParameterChecker() {
    const AaveLendChecker = await ethers.deployContract("AaveLendParameterChecker");
    const AavePoolV3 = await ethers.deployContract("AavePoolV3");
    
    return {AaveLendChecker, AavePoolV3};
}
async function deployUniswapSwapParameterChecker() {
    const UniswapSwapChecker = await ethers.deployContract("UniswapSwapParameterChecker");
    
    return {UniswapSwapChecker};
}

async function deployKnightSafeWithTenEth() {    
    const { masterCopy, owner, trader, otherAddr1 } = await loadFixture(deployMasterCopy);   
    const { proxyFactory } = await loadFixture(deployProxyFactory);
    
    const setupData = masterCopy.interface.encodeFunctionData("setup", [owner.address, [], [], [], [], false]);
    const tx = await proxyFactory.createProxy(masterCopy.target, setupData);
    const rc = await tx.wait();

    const event = rc.logs.find(event => event.address == proxyFactory.target);
    const proxy = ethers.getAddress(event.data.slice(26, 66));
    
    const Delegate = await ethers.getContractFactory("KnightSafe");
    const knightSafe = await Delegate.attach(proxy);
    
    const ethAmount = ethers.parseUnits("2", "ether");
    const sendEth = await owner.sendTransaction({to: knightSafe.target, value: ethers.parseUnits("10", "ether")});

    return { knightSafe, owner, trader, otherAddr1, masterCopy, proxyFactory };
}


describe("Deploy test case", function() {

    describe("Deploy Master Copy", function () {

        it("deployed master copy should have owner = 0x1", async function() {
            const { masterCopy, owner } = await loadFixture(deployMasterCopy);        
            
            expect(await masterCopy.getOwner()).to.equal(addressOne);
        });

        it("Master copy's setup should not be able to call", async function() {        
            const { masterCopy, owner } = await loadFixture(deployMasterCopy);        

            await expect(masterCopy.setup(owner.address, [], [], [], [], true)).to.be.revertedWith("can only setup once");
        });
    });

    describe("Deploy Proxy Factory", function() {

        it("proxy factory should be non-zero address", async function() {
            const {proxyFactory} = await loadFixture(deployProxyFactory);

            expect(proxyFactory.target).to.not.equal(addressZero);
        });
    });

    describe("Deploy Test Parameter Checker", function() {

        it("test parameter checker should be non-zero address", async function() {
            const {testParameterChecker} = await loadFixture(deployTestParameterChecker);

            expect(testParameterChecker.target).to.not.equal(addressZero);
        });
    });

    describe("Deploy Knight Safe with empty settings", function() {

        it("owner should match signer address", async function() {

            const {knightSafe, owner, trader, otherAddr1} = await loadFixture(deployKnightSafeWithTenEth);

            expect(await knightSafe.getOwner()).to.equal(owner.address);
        });

        it("should have zero whitelisted traders", async function() {

            const {knightSafe, owner, trader, otherAddr1} = await loadFixture(deployKnightSafeWithTenEth);

            expect(await knightSafe.getTraders()).to.have.length(0);
        });

        it("whitelisted addressees should contain owner and knightSafe itself", async function() {

            const {knightSafe, owner, trader, otherAddr1} = await loadFixture(deployKnightSafeWithTenEth);

            expect(await knightSafe.getWhitelistAddresses()).to.eql([owner.address, knightSafe.target]);
        });

        it("knightSafe is setup with 10 eth", async function() {

            const {knightSafe, owner, trader, otherAddr1} = await loadFixture(deployKnightSafeWithTenEth);

            expect(await ethers.provider.getBalance(knightSafe.target)).to.equal(ethers.parseUnits("10", "ether"));
        });
    });
});


describe("Ownership test case", function() {
    
    describe("transferOwnership", function() {
        
        it("owner can set pending owner", async function() {
        
            const {knightSafe, owner, trader, otherAddr1} = await loadFixture(deployKnightSafeWithTenEth);
            
            expect(await knightSafe.getPendingOwner()).to.equal(addressZero);

            await knightSafe.transferOwnership(otherAddr1.address);
            expect(await knightSafe.getPendingOwner()).to.equal(otherAddr1.address);
        });
        
        it("non-owner cannot set pending owner", async function() {
        
            const {knightSafe, owner, trader, otherAddr1} = await loadFixture(deployKnightSafeWithTenEth);            

            await expect(knightSafe.connect(trader).transferOwnership(otherAddr1.address)).to.be.revertedWith("Owner only");
        });
        
        it("pending owner cannot set pending owner", async function() {
        
            const {knightSafe, owner, trader, otherAddr1} = await loadFixture(deployKnightSafeWithTenEth);
            
            await knightSafe.transferOwnership(otherAddr1.address);

            await expect(knightSafe.connect(otherAddr1).transferOwnership(trader.address)).to.be.revertedWith("Owner only");
        });
        
        it("owner can set pending owner to null address", async function() {
        
            const {knightSafe, owner, trader, otherAddr1} = await loadFixture(deployKnightSafeWithTenEth);
            
            await knightSafe.transferOwnership(otherAddr1.address);
            
            await knightSafe.transferOwnership(addressZero);
            expect(await knightSafe.getPendingOwner()).to.equal(addressZero);
        });
    });
    
    describe("acceptOwnership", function() {
        
        it("pending owner can accept ownership transfer", async function() {
        
            const {knightSafe, owner, trader, otherAddr1} = await loadFixture(deployKnightSafeWithTenEth);
            
            await knightSafe.transferOwnership(otherAddr1.address);
            
            await knightSafe.connect(otherAddr1).acceptOwnership();
            expect(await knightSafe.getOwner()).to.equal(otherAddr1.address);
            expect(await knightSafe.getPendingOwner()).to.equal(addressZero);
        });
        
        it("non-pending owner cannot accept ownership transfer", async function() {
        
            const {knightSafe, owner, trader, otherAddr1} = await loadFixture(deployKnightSafeWithTenEth);
            
            await knightSafe.transferOwnership(otherAddr1.address);
            
            await knightSafe.connect(otherAddr1).acceptOwnership();
            
            await expect(knightSafe.connect(otherAddr1).acceptOwnership()).to.be.revertedWith("Not proposed new owner");
        });        
    });
});


describe("Trader test case", function() {
    
    describe("addTrader", function() {

        it("owner can add trader", async function() {
    
            const {knightSafe, owner, trader, otherAddr1} = await loadFixture(deployKnightSafeWithTenEth);
            
            await knightSafe.addTrader(trader.address);
            
            expect(await knightSafe.getTraders()).to.have.length(1);
            expect(await knightSafe.isTrader(trader.address)).to.equal(true);
        });

        it("random address cannot add trader", async function() {

            const {knightSafe, owner, trader, otherAddr1} = await loadFixture(deployKnightSafeWithTenEth);
            
            await expect(knightSafe.connect(otherAddr1).addTrader(trader.address)).to.be.revertedWith("Owner only");
        });

        it("trader cannot add another trader", async function() {

            const {knightSafe, owner, trader, otherAddr1} = await loadFixture(deployKnightSafeWithTenEth);

            await knightSafe.addTrader(trader.address);
            
            await expect(knightSafe.connect(trader).addTrader(otherAddr1.address)).to.be.revertedWith("Owner only");
        });        

        it("existing trader cannot be added again", async function() {
    
            const {knightSafe, owner, trader, otherAddr1} = await loadFixture(deployKnightSafeWithTenEth);
            
            await knightSafe.addTrader(trader.address);
            await expect(knightSafe.addTrader(trader.address)).to.be.revertedWith("New trader already in trader list");            
        });
    });
    
    describe("removeTrader", function() {

        it("owner can remove trader", async function() {
    
            const {knightSafe, owner, trader, otherAddr1} = await loadFixture(deployKnightSafeWithTenEth);
            
            await knightSafe.addTrader(trader.address);
            expect(await knightSafe.getTraders()).to.have.length(1);
            
            await knightSafe.removeTrader(trader.address);
            expect(await knightSafe.getTraders()).to.have.length(0);
        });

        it("random address cannot remove trader", async function() {

            const {knightSafe, owner, trader, otherAddr1} = await loadFixture(deployKnightSafeWithTenEth);

            await knightSafe.addTrader(trader.address);
            
            await expect(knightSafe.connect(otherAddr1).removeTrader(trader.address)).to.be.revertedWith("Owner only");
        });

        it("trader cannot remove trader", async function() {

            const {knightSafe, owner, trader, otherAddr1} = await loadFixture(deployKnightSafeWithTenEth);

            await knightSafe.addTrader(trader.address);
            
            await expect(knightSafe.connect(trader).removeTrader(trader.address)).to.be.revertedWith("Owner only");
        });     

        it("non-existing trader cannot be removed", async function() {
    
            const {knightSafe, owner, trader, otherAddr1} = await loadFixture(deployKnightSafeWithTenEth);
            
            await knightSafe.addTrader(trader.address);
            await expect(knightSafe.removeTrader(otherAddr1.address)).to.be.revertedWith("Trader is not in trader list");            
        });   
    });

    describe("batchUpdateTraders", function() {

        it("adding and/or removing multiple addresseses at the same time", async function() {
    
            const {knightSafe, owner, trader, otherAddr1} = await loadFixture(deployKnightSafeWithTenEth);
            const [, , , otherAddr2, otherAddr3, otherAddr4] = await ethers.getSigners();
            
            await knightSafe.batchUpdateTraders([], [trader.address, otherAddr1.address]);
            expect(await knightSafe.getTraders()).to.eql([otherAddr1.address, trader.address]);
            
            await knightSafe.batchUpdateTraders([trader.address, otherAddr1.address], [otherAddr2.address, otherAddr3.address, otherAddr4.address]);
            expect(await knightSafe.getTraders()).to.eql([otherAddr4.address, otherAddr3.address, otherAddr2.address]);
            
            await knightSafe.batchUpdateTraders([otherAddr2.address, otherAddr3.address], []);
            expect(await knightSafe.getTraders()).to.eql([otherAddr4.address]);    
        });
    });
    
    describe("trader sending transaction", function() {

        it("trader can operate knightSafe to send eth to owner", async function() {

            const {knightSafe, owner, trader, otherAddr1} = await loadFixture(deployKnightSafeWithTenEth);            
            
            await knightSafe.addTrader(trader.address);
            await knightSafe.connect(trader).execTransaction(owner.address, ethers.parseUnits("3", "ether"), "0x");

            expect(await ethers.provider.getBalance(knightSafe.target)).to.equal(ethers.parseUnits("7", "ether"));
        });

        it("random address cannot operate knightSafe to send eth to owner", async function() {

            const {knightSafe, owner, trader, otherAddr1} = await loadFixture(deployKnightSafeWithTenEth);
            
            await knightSafe.addTrader(trader.address);
            await expect(knightSafe.connect(otherAddr1).execTransaction(owner.address, ethers.parseUnits("3", "ether"), "0x")).to.be.revertedWith("Trader only");
        });

        it("owner cannot operate knightSafe to send eth to owner", async function() {

            const {knightSafe, owner, trader, otherAddr1} = await loadFixture(deployKnightSafeWithTenEth);
            
            await knightSafe.addTrader(trader.address);
            await expect(knightSafe.execTransaction(owner.address, ethers.parseUnits("3", "ether"), "0x")).to.be.revertedWith("Trader only");
        });
    });    
});

    
describe("Whitelist test case", function() {
    
    describe("updateWhitelistAddress", function() {

        it("owner can add whitelist address", async function() {
    
            const {knightSafe, owner, trader, otherAddr1} = await loadFixture(deployKnightSafeWithTenEth);
            
            await knightSafe.addTrader(trader.address);

            await knightSafe.updateWhitelistAddress(otherAddr1.address, ["0x1234abcd", "0x11111111", "0x22222222"], [[1,3,4], [], [0]]);            

            expect(await knightSafe.getWhitelistAddresses()).to.eql([otherAddr1.address, owner.address, knightSafe.target]);
            expect(await knightSafe.getWhitelistFunctionParameters(otherAddr1.address, "0x1234abcd")).to.eql([1n, 3n, 4n]);
        });

        it("trader cannot add whitelist address", async function() {
    
            const {knightSafe, owner, trader, otherAddr1} = await loadFixture(deployKnightSafeWithTenEth);
            
            await knightSafe.addTrader(trader.address);

            await expect(knightSafe.connect(trader).updateWhitelistAddress(otherAddr1.address, ["0x1234abcd", "0x11111111", "0x22222222"], [[1,3,4], [], [0]])).to.be.revertedWith("Owner only");
        });

        it("random address cannot add whitelist address", async function() {
    
            const {knightSafe, owner, trader, otherAddr1} = await loadFixture(deployKnightSafeWithTenEth);
            
            await knightSafe.addTrader(trader.address);

            await expect(knightSafe.connect(otherAddr1).updateWhitelistAddress(otherAddr1.address, ["0x1234abcd", "0x11111111", "0x22222222"], [[1,3,4], [], [0]])).to.be.revertedWith("Owner only");
        });

        it("existing whitelisted address can be updated", async function() {
    
            const {knightSafe, owner, trader, otherAddr1} = await loadFixture(deployKnightSafeWithTenEth);
            
            await knightSafe.addTrader(trader.address);

            await knightSafe.updateWhitelistAddress(otherAddr1.address, ["0x1234abcd", "0x11111111", "0x22222222"], [[1,3,4], [], [0]]);            

            expect(await knightSafe.getWhitelistFunctionParameters(otherAddr1.address, "0x1234abcd")).to.eql([1n, 3n, 4n]);

            await knightSafe.updateWhitelistAddress(otherAddr1.address, ["0x1234abcd"], [[2]]);            

            expect(await knightSafe.getWhitelistFunctionParameters(otherAddr1.address, "0x1234abcd")).to.eql([2n]);
        });
    });
   
    
    describe("removeWhitelistAddress", function() {

        it("owner can remove whitelist address", async function() {
    
            const {knightSafe, owner, trader, otherAddr1} = await loadFixture(deployKnightSafeWithTenEth);
            
            await knightSafe.addTrader(trader.address);
          
            await knightSafe.removeWhitelistAddress(owner.address);

            expect(await knightSafe.getWhitelistAddresses()).to.eql([knightSafe.target]);
        });

        it("trader cannot remove whitelist address", async function() {
    
            const {knightSafe, owner, trader, otherAddr1} = await loadFixture(deployKnightSafeWithTenEth);
            
            await knightSafe.addTrader(trader.address);
           
            await expect(knightSafe.connect(trader).removeWhitelistAddress(otherAddr1.address)).to.be.revertedWith("Owner only");
        });

        it("random address cannot remove whitelist address", async function() {
    
            const {knightSafe, owner, trader, otherAddr1} = await loadFixture(deployKnightSafeWithTenEth);
            
            await knightSafe.addTrader(trader.address);
          
            await expect(knightSafe.connect(otherAddr1).removeWhitelistAddress(otherAddr1.address)).to.be.revertedWith("Owner only");
        });

        it("non-existing whitelist address cannot be removed", async function() {
    
            const {knightSafe, owner, trader, otherAddr1} = await loadFixture(deployKnightSafeWithTenEth);
            
            await knightSafe.addTrader(trader.address);
     
            await expect(knightSafe.removeWhitelistAddress(otherAddr1.address)).to.be.revertedWith("Input address is not in the whitelist");
        });
    });
    
    describe("batchUpdateWhitelistAddresses", function() {

        it("adding and/or removing multiple whitelist addresseses at the same time", async function() {
    
            const {knightSafe, owner, trader, otherAddr1} = await loadFixture(deployKnightSafeWithTenEth);
            const [, , , otherAddr2, otherAddr3] = await ethers.getSigners();
            
            await knightSafe.batchUpdateWhitelistAddresses([], [otherAddr1.address, otherAddr2.address], [["0x11111111", "0x22222222"], ["0x33333333"]], [[[1], [2]], [[3]]]);
            expect(await knightSafe.getWhitelistAddresses()).to.eql([otherAddr2.address, otherAddr1.address, owner.address, knightSafe.target]);
            
            await knightSafe.batchUpdateWhitelistAddresses([owner.address, knightSafe.target], [otherAddr3.address], [[]], [[]]);
            expect(await knightSafe.getWhitelistAddresses()).to.eql([otherAddr3.address, otherAddr2.address, otherAddr1.address]);
            
            await knightSafe.batchUpdateWhitelistAddresses([otherAddr2.address, otherAddr3.address], [], [], []);
            expect(await knightSafe.getWhitelistAddresses()).to.eql([otherAddr1.address]);    
        });
    });
});


describe("Smart contract interaction test case", function() {
    
    describe("execTransaction", function() {

        it("success with authorized trader and whitelisted address", async function() {
    
            const {knightSafe, owner, trader, otherAddr1, masterCopy, proxyFactory } = await loadFixture(deployKnightSafeWithTenEth);
            
            await knightSafe.addTrader(trader.address);
            await knightSafe.updateWhitelistAddress(proxyFactory.target, ["0x61b69abd"], [[0]]);             
            
            const setupData = masterCopy.interface.encodeFunctionData("setup", [knightSafe.target, [trader.address], [], [], [], false]);
            const execData = proxyFactory.interface.encodeFunctionData("createProxy", [masterCopy.target, setupData]);
            
            const tx = await knightSafe.connect(trader).execTransaction(proxyFactory.target, 0, execData);
            const rc = await tx.wait();
    
            const event = rc.logs.find(event => event.address == proxyFactory.target);
            const proxy = ethers.getAddress(event.data.slice(26, 66));
    
            const Delegate = await ethers.getContractFactory("KnightSafe");
            const knightSafe2 = await Delegate.attach(proxy);
    
            expect(await knightSafe2.getOwner()).to.eql(knightSafe.target);
            expect(await knightSafe2.getTraders()).to.eql([trader.address]);
        });
       
        
        it("revert with unauthorized trader and whitelisted address", async function() {
    
            const {knightSafe, owner, trader, otherAddr1, masterCopy, proxyFactory } = await loadFixture(deployKnightSafeWithTenEth);
            
            //await knightSafe.addTrader(trader.address);
            await knightSafe.updateWhitelistAddress(proxyFactory.target, ["0x61b69abd"], [[0]]);      
            
            const setupData = masterCopy.interface.encodeFunctionData("setup", [knightSafe.target, [trader.address], [], [], [], false]);
            const execData = proxyFactory.interface.encodeFunctionData("createProxy", [masterCopy.target, setupData]);
            
            await expect(knightSafe.connect(trader).execTransaction(proxyFactory.target, 0, execData)).to.be.revertedWith("Trader only");
        });

        
        it("revert with authorized trader but non whitelist address", async function() {
    
            const {knightSafe, owner, trader, otherAddr1, masterCopy, proxyFactory } = await loadFixture(deployKnightSafeWithTenEth);
            
            await knightSafe.addTrader(trader.address);
            // await knightSafe.updateWhitelistAddress(proxyFactory.target, ["0x61b69abd"], [[0]]);      
            
            const setupData = masterCopy.interface.encodeFunctionData("setup", [knightSafe.target, [trader.address], [], [], [], false]);
            const execData = proxyFactory.interface.encodeFunctionData("createProxy", [masterCopy.target, setupData]);
            
            await expect(knightSafe.connect(trader).execTransaction(proxyFactory.target, 0, execData)).to.be.revertedWith("To address not in whitelist");
        });
        
        
        it("revert with authorized trader, whitelisted address, but non whitelist selector", async function() {
    
            const {knightSafe, owner, trader, otherAddr1, masterCopy, proxyFactory } = await loadFixture(deployKnightSafeWithTenEth);
            
            await knightSafe.addTrader(trader.address);
            await knightSafe.updateWhitelistAddress(proxyFactory.target, [], []);            
            
            const setupData = masterCopy.interface.encodeFunctionData("setup", [knightSafe.target, [trader.address], [], [], [], false]);
            const execData = proxyFactory.interface.encodeFunctionData("createProxy", [masterCopy.target, setupData]);
            
            await expect(knightSafe.connect(trader).execTransaction(proxyFactory.target, 0, execData)).to.be.revertedWith("Selector not in whitelist");
        });
        
        
        it("revert with authorized trader, whitelisted address, whitelisted function but parameter address not in whitelist", async function() {
    
            const {knightSafe, owner, trader, otherAddr1, masterCopy, proxyFactory } = await loadFixture(deployKnightSafeWithTenEth);
            
            await knightSafe.addTrader(trader.address);
            await knightSafe.updateWhitelistAddress(proxyFactory.target, ['0x61b69abd'], [[1]]);            
            
            const setupData = masterCopy.interface.encodeFunctionData("setup", [knightSafe.target, [trader.address], [], [], [], false]);
            const execData = proxyFactory.interface.encodeFunctionData("createProxy", [masterCopy.target, setupData]);
           
            await expect(knightSafe.connect(trader).execTransaction(proxyFactory.target, 0, execData)).to.be.revertedWith("Parameter address not in whitelist");
        });
        
        it("revert with authorized trader, whitelisted address, whitelisted function but parameter address from external parameter checker not in whitelist", async function() {
    
            const { knightSafe, owner, trader, otherAddr1, masterCopy, proxyFactory } = await loadFixture(deployKnightSafeWithTenEth);
            const { testParameterChecker } = await loadFixture(deployTestParameterChecker);

            const s = testParameterChecker.target.replace("0x", "0x100000000000000000000000");
            const toAddr = otherAddr1;
            
            await knightSafe.addTrader(trader.address);
            await knightSafe.updateWhitelistAddress(toAddr, ['0x00000000', '0x11111111', '0x22222222'], [[s], [s], [s]]);

            const data0 = "0x0000000000000000000000000000000000000001";
            const data1 = "0x1111111100000000000000000000000000000001";
            const data2 = "0x2222222200000000000000000000000000000001";
                        
            await expect(knightSafe.connect(trader).execTransaction(toAddr, 0, data0)).to.be.revertedWith("Parameter address not in whitelist");
            await knightSafe.connect(trader).execTransaction(toAddr, 0, data1);
            await expect(knightSafe.connect(trader).execTransaction(toAddr, 0, data2)).to.be.revertedWith("Parameter Checker should not return empty list");
        });
        
        it("testing gmx trade checker", async function() {
    
            const { knightSafe, owner, trader, otherAddr1, masterCopy, proxyFactory } = await loadFixture(deployKnightSafeWithTenEth);
            const { gmxTradeChecker } = await loadFixture(deployGmxTradeParameterChecker);

            const s = gmxTradeChecker.target.replace("0x", "0x100000000000000000000000");
            const toAddr = "0xaBBc5F99639c9B6bCb58544ddf04EFA6802F4064";
            
            await knightSafe.addTrader(trader.address);
            await knightSafe.updateWhitelistAddress(toAddr, ['0xabe68eaa'], [[s]]);

            const data = "0xabe68eaa000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000001c00e30000000000000000000000004b8e58c3F79e7E56010aB669ed37f4A1e9704D1C000000000000000000000000000000000000000000000000000000000000000200000000000000000000000082af49447d8a07e3bd95bd0d56f35241523fbab1000000000000000000000000fd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9";
                        
            await expect(knightSafe.connect(trader).execTransaction(toAddr, 0, data)).to.be.revertedWith("Parameter address not in whitelist");
            
            await knightSafe.updateWhitelistAddress("0x4b8e58c3F79e7E56010aB669ed37f4A1e9704D1C", [], []);
            await knightSafe.updateWhitelistAddress("0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9", [], []);
            await knightSafe.connect(trader).execTransaction(toAddr, 0, data);
        });
        
        it("testing aave lend checker", async function() {
    
            const { knightSafe, owner, trader, otherAddr1, masterCopy, proxyFactory } = await loadFixture(deployKnightSafeWithTenEth);
            const { AaveLendChecker, AavePoolV3 } = await loadFixture(deployAaveLendParameterChecker);

            const s = AaveLendChecker.target.replace("0x", "0x100000000000000000000000");
            const toAddr = AavePoolV3.target;
            
            await knightSafe.addTrader(trader.address);
            await knightSafe.updateWhitelistAddress(toAddr, ['0x563dd613'], [[s]]);

            const data = "0x563dd6130000000000000000000000000002000000000000000000000000000f42400002";
                        
            await expect(knightSafe.connect(trader).execTransaction(toAddr, 0, data)).to.be.revertedWith("Parameter address not in whitelist");
            
            await knightSafe.updateWhitelistAddress("0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", [], []);
            await knightSafe.connect(trader).execTransaction(toAddr, 0, data);
        });
       
        it("testing uniswap swap checker v3", async function() {
    
            const { knightSafe, owner, trader, otherAddr1, masterCopy, proxyFactory } = await loadFixture(deployKnightSafeWithTenEth);
            const { UniswapSwapChecker } = await loadFixture(deployUniswapSwapParameterChecker);

            const s = UniswapSwapChecker.target.replace("0x", "0x100000000000000000000000");
            const toAddr = "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD";
            
            await knightSafe.addTrader(trader.address);
            await knightSafe.updateWhitelistAddress(toAddr, ['0x3593564c'], [[s]]);

            const data = "0x3593564c000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000064dbb0f50000000000000000000000000000000000000000000000000000000000000002000c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000f42400000000000000000000000000000000000000000000000000001ec0c2598a4cb00000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002bfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb90001f482af49447d8a07e3bd95bd0d56f35241523fbab1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000001ec0c2598a4cb"
                        
            await expect(knightSafe.connect(trader).execTransaction(toAddr, 0, data)).to.be.revertedWith("Parameter address not in whitelist");
            
            await knightSafe.updateWhitelistAddress("0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9", [], []);
            await knightSafe.updateWhitelistAddress("0x82af49447d8a07e3bd95bd0d56f35241523fbab1", [], []);
            await knightSafe.connect(trader).execTransaction(toAddr, 0, data);
        });
        
        it("testing uniswap swap checker v2", async function() {
    
            const { knightSafe, owner, trader, otherAddr1, masterCopy, proxyFactory } = await loadFixture(deployKnightSafeWithTenEth);
            const { UniswapSwapChecker } = await loadFixture(deployUniswapSwapParameterChecker);

            const s = UniswapSwapChecker.target.replace("0x", "0x100000000000000000000000");
            const toAddr = "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD";
            
            await knightSafe.addTrader(trader.address);
            await knightSafe.updateWhitelistAddress(toAddr, ['0x3593564c'], [[s]]);

            // const data = "0x3593564c000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000006511ab8b0000000000000000000000000000000000000000000000000000000000000002080c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000009896800000000000000000000000000000000000000000000000000015698f408dba9d00000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec7000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000015698f408dba9d"
            const data = "0x3593564c000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000651249e300000000000000000000000000000000000000000000000000000000000000020b080000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000005af3107a40000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000005af3107a40000000000000000000000000000000000000000000000000000000000000024d2900000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec7"                        
            
            await expect(knightSafe.connect(trader).execTransaction(toAddr, 0, data)).to.be.revertedWith("Parameter address not in whitelist");
            
            await knightSafe.updateWhitelistAddress("0xdAC17F958D2ee523a2206206994597C13D831ec7", [], []);
            // await knightSafe.updateWhitelistAddress("0x82af49447d8a07e3bd95bd0d56f35241523fbab1", [], []);
            await knightSafe.connect(trader).execTransaction(toAddr, 0, data);
        });
    });
});


describe("Gas refund test case", function() {
    
    describe("setOwnerRefundGasSpentToSender", function() {

        it("owner can set gas refund", async function() {
    
            const {knightSafe, owner, trader, otherAddr1, masterCopy, proxyFactory } = await loadFixture(deployKnightSafeWithTenEth);
            
            expect(await knightSafe.getIsGasRefund()).to.eql(false);

            await knightSafe.setOwnerRefundGasSpentToSender(true);
            
            expect(await knightSafe.getIsGasRefund()).to.eql(true);
        });

        it("trader cannot set gas refund", async function() {
    
            const {knightSafe, owner, trader, otherAddr1, masterCopy, proxyFactory } = await loadFixture(deployKnightSafeWithTenEth);

            await knightSafe.addTrader(trader.address);
            
            await expect(knightSafe.connect(trader).setOwnerRefundGasSpentToSender(true)).to.be.revertedWith("Owner only");
        });

        it("random address cannot set gas refund", async function() {
    
            const {knightSafe, owner, trader, otherAddr1, masterCopy, proxyFactory } = await loadFixture(deployKnightSafeWithTenEth);

            await knightSafe.addTrader(trader.address);
            
            await expect(knightSafe.connect(otherAddr1).setOwnerRefundGasSpentToSender(true)).to.be.revertedWith("Owner only");
        });
    });
    
    describe("check gas fund logic", function() {

        it("trader pays gas if no refund", async function() {
    
            const {knightSafe, owner, trader, otherAddr1, masterCopy, proxyFactory } = await loadFixture(deployKnightSafeWithTenEth);
            
            expect(await knightSafe.getIsGasRefund()).to.eql(false);            
            
            await knightSafe.addTrader(trader.address);
            // await knightSafe.setOwnerRefundGasSpentToSender(true);
            
            const traderBalanceBefore = await ethers.provider.getBalance(trader.address);

            const tx = await knightSafe.connect(trader).execTransaction(owner.address, ethers.parseUnits("3", "ether"), "0x");                        
            const rc = await tx.wait();

            const traderBalanceAfter = await ethers.provider.getBalance(trader.address);

            expect(traderBalanceBefore-traderBalanceAfter).to.eql(rc.gasUsed * rc.gasPrice);
            
        });
        
        it("trader's balance remain the same if refund by knightSafe", async function() {
    
            const {knightSafe, owner, trader, otherAddr1, masterCopy, proxyFactory } = await loadFixture(deployKnightSafeWithTenEth);
            
            expect(await knightSafe.getIsGasRefund()).to.eql(false);            
            
            await knightSafe.addTrader(trader.address);
            await knightSafe.setOwnerRefundGasSpentToSender(true);
            
            const traderBalanceBefore = await ethers.provider.getBalance(trader.address);
            await knightSafe.connect(trader).execTransaction(owner.address, ethers.parseUnits("3", "ether"), "0x");                        
            
            const traderBalanceAfter = await ethers.provider.getBalance(trader.address);

            expect(traderBalanceBefore).to.eql(traderBalanceAfter);
            
        });
    });
});