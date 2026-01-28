#![allow(unexpected_cfgs)]
#![cfg_attr(not(feature = "export-abi"), no_std, no_main)]

extern crate alloc;

use alloc::vec;
use alloc::vec::Vec;
use stylus_sdk::{alloy_primitives::*, alloy_sol_types::*, prelude::*, storage::*};

sol_storage! {
    #[entrypoint]
    struct GainJar {
        mapping(address => mapping(address => Employee)) employees;

        mapping(address => address[]) employee_to_allowed_tokens;

        mapping(address => mapping(address => uint256)) employer_token_balances;
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
    error EmployeeAlreadyExists();
    error EmployeeNotFound();
    error InsufficientFunds();
    error Unauthorized();
    error InvalidPaymentInterval();
    error TokenNotAllowed();
    error TokenAlreadyAllowed();

    event EmployeeAdded(address indexed employer, address indexed employee);
    event PaymentExecuted(address indexed employer, address indexed employee, uint256 amount);
    event FundsDeposited(address indexed employer, uint256 amount);
}

#[derive(SolidityError)]
pub enum GainJarErrors {
    EmployeeAlreadyExists(EmployeeAlreadyExists),
    EmployeeNotFound(EmployeeNotFound),
    InsufficientFunds(InsufficientFunds),
    Unauthorized(Unauthorized),
    InvalidPaymentInterval(InvalidPaymentInterval),
    TokenNotAllowed(TokenNotAllowed),
    TokenAlreadyAllowed(TokenAlreadyAllowed),
}

#[public]
impl GainJar {
    pub fn add_allowed_token(&mut self, token: Address) -> Result<(), GainJarErrors> {
        let mut allowed_tokens = self
            .employee_to_allowed_tokens
            .setter(self.vm().msg_sender());

        for i in 0..allowed_tokens.len() {
            if allowed_tokens.get(i).unwrap() == token {
                return Err(GainJarErrors::TokenAlreadyAllowed(TokenAlreadyAllowed));
            }
        }

        allowed_tokens.push(token);

        Ok(())
    }

    pub fn add_employee(
        &mut self,
        employee: Address,
        salary_amount: U256,
        payment_interval: U256,
    ) -> Result<(), GainJarErrors> {
        Ok(())
    }
}
