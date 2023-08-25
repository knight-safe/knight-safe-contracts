// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

import "../interfaces/IParameterChecker.sol";

contract GmxTradeParameterChecker is IParameterChecker {
    
    function getAddressListForChecking(
        address to,
        bytes4 selector,
        bytes calldata data
    ) external override pure returns (address[] memory) {
        if (selector == 0x5fc8500e // decreasePositionAndSwap(_path:address[],_indexToken:address,_collateralDelta:uint256,_sizeDelta:uint256,_isLong:bool,_receiver:address,_price:uint256,_minOut:uint256)
         || selector == 0xb7ddc992 // increasePosition(_path:address[],_indexToken:address,_amountIn:uint256,_minOut:uint256,_sizeDelta:uint256,_isLong:bool,_price:uint256)
         || selector == 0x6023e966 // swap(_path:address[],_amountIn:uint256,_minOut:uint256,_receiver:address)
         || selector == 0x6023e966 // createIncreasePosition(_path:address[],_indexToken:address,_amountIn:uint256,_minOut:uint256,_sizeDelta:uint256,_isLong:bool,_acceptablePrice:uint256,_executionFee:uint256,_referralCode:bytes32,_callbackTarget:address)
         ) {             
            address[] calldata path = getAddressArray(data, 0);
            return getPathFirstLast(path);
        }
        else if (selector == 0x3039e37f // decreasePositionAndSwapETH(_path:address[],_indexToken:address,_collateralDelta:uint256,_sizeDelta:uint256,_isLong:bool,_receiver:address,_price:uint256,_minOut:uint256)
              || selector == 0x2d4ba6a7 // swapTokensToETH(_path:address[],_amountIn:uint256,_minOut:uint256,_receiver:address)
        ) {                 
            address[] calldata path = getAddressArray(data, 0);
            return getPathFirst(path);
        }
        else if (selector == 0xb32755de // increasePositionETH(_path:address[],_indexToken:address,_minOut:uint256,_sizeDelta:uint256,_isLong:bool,_price:uint256)
              || selector == 0xabe68eaa // swapETHToTokens(_path:address[],_minOut:uint256,_receiver:address)
              || selector == 0x5b88e8c6 // createIncreasePositionETH(_path:address[],_indexToken:address,_minOut:uint256,_sizeDelta:uint256,_isLong:bool,_acceptablePrice:uint256,_executionFee:uint256,_referralCode:bytes32,_callbackTarget:address)
        ) {             
            address[] calldata path = getAddressArray(data, 0);
            return getPathLast(path);
        }
        else if (selector == 0x7be7d141 // createDecreasePosition(_path:address[],_indexToken:address,_collateralDelta:uint256,_sizeDelta:uint256,_isLong:bool,_receiver:address,_acceptablePrice:uint256,_minOut:uint256,_executionFee:uint256,_withdrawETH:bool,_callbackTarget:address)              
        ) {             
            address[] calldata path = getAddressArray(data, 0);
            bool withdrawETH = getBool(data, 9);
            if (withdrawETH) {
                return getPathFirst(path);
            }
            else {
                return getPathFirstLast(path);
            }
        }
        else if (selector == 0xb142a4b0 // createIncreaseOrder(_path:address[],_amountIn:uint256,_indexToken:address,_minOut:uint256,_sizeDelta:uint256,_collateralToken:address,_isLong:bool,_triggerPrice:uint256,_triggerAboveThreshold:bool,_executionFee:uint256,_shouldWrap:bool)
        ) {             
            address[] calldata path = getAddressArray(data, 0);
            bool shouldWrap = getBool(data, 10);
            if (shouldWrap) {
                return getPathLast(path);
            }
            else {
                return getPathFirstLast(path);
            }
        }
        else if (selector == 0x269ae6c2 // createSwapOrder(_path:address[],_amountIn:uint256,_minOut:uint256,_triggerRatio:uint256,_triggerAboveThreshold:bool,_executionFee:uint256,_shouldWrap:bool,_shouldUnwrap:bool)
        ) {             
            address[] calldata path = getAddressArray(data, 0);
            bool shouldWrap = getBool(data, 6);
            bool shouldUnwrap = getBool(data, 7);
            if (shouldWrap) {
                return getPathLast(path);
            }
            else if (shouldUnwrap) {
                return getPathFirst(path);
            }
            else {
                return getPathFirstLast(path);
            }
        }        
        return new address[](0);
    }

    function getPathFirst(address[] calldata path) internal pure returns (address[] memory rv) {
        rv = new address[](1);
        rv[0] = path[0];
        return rv;
    }

    function getPathLast(address[] calldata path) internal pure returns (address[] memory rv) {
        rv = new address[](1);
        rv[0] = path[path.length-1];
        return rv;
    }

    function getPathFirstLast(address[] calldata path) internal pure returns (address[] memory rv) {
        rv = new address[](2);
        rv[0] = path[0];
        rv[1] = path[path.length-1];
        return rv;
    }

    function getAddressArray(bytes calldata data, uint256 pos) internal pure returns (address[] calldata rv) {        
        assembly {        
            let lengthPtr := add(add(data.offset, calldataload(add(add(data.offset, shl(5, pos)), 4))), 4)
            rv.length := calldataload(lengthPtr)
            rv.offset := add(lengthPtr, 0x20)
        }
    }
    
    function getBool(bytes calldata data, uint256 pos) internal pure returns (bool rv) {        
        assembly {        
            rv := calldataload(add(add(data.offset, shl(5, pos)), 4))
        }
    }
}
