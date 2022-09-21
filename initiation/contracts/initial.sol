// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract initial{
int num;

function get() public view returns(int){
return num;
}

function set(int _num) public{
num=_num;
}
}