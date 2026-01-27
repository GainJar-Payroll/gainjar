#![allow(unexpected_cfgs)]
#![cfg_attr(not(feature = "export-abi"), no_std)]
#![cfg_attr(not(feature = "export-abi"), no_main)]

extern crate alloc;

use alloc::vec;
use alloc::vec::Vec;
use stylus_sdk::{alloy_primitives::*, alloy_sol_types::sol, prelude::*};

sol_storage! {
    #[entrypoint]
    struct GainJar {
        mapping(address => Employee) employees;
    }

    struct Employee {
        address wallet;
        uint256 salary_amount;
        uint256 last_payment;
        uint256 payment_interval;
        bool is_active;
    }
}

sol! {
    event EmployeeAdded(address indexed employer, address indexed employee);
    event PaymentExecuted(address indexed employer, address indexed employee, uint256 amount);
    event FundsDeposited(address indexed employer, uint256 amount);
}

#[public]
impl GainJar {}
