const { body } = require('express-validator/check')

exports.validate = (method, req) => {
  switch (method) {
    case 'postTrade': {
      req.checkBody('tradeTxid', `trade txid must be a 10 character string`).exists().matches(/^\w{10,10}$/)
      req.checkBody('depositTxid', `deposit txid must be a 10 character string`).exists().matches(/^\w{10,10}$/)
      req.checkBody('tradeCurrency', `trade currency name must be a 3 to 5 characters string`).exists().matches(/^\w{3,5}$/)
      break
    }
    case 'getTrade': {
      req.checkBody('tradeTxid', `trade txid must be a 10 character string`).exists().matches(/^\w{10,10}$/)
      break
    }
    case 'claim': {
      req.checkBody('tradeCurrency', `trade currency name must be a 3 to 5 characters string`).exists().matches(/^\w{3,5}$/)
      req.checkBody('tradeTxid', `trade txid must be a 10 character string`).exists().matches(/^\w{10,10}$/)
      req.checkBody('refundAddress', `address to send the refund to`).exists()
      break
    }
    case 'deposit': {
      req.checkBody('locktime', 'locktime must be a 10 digit unix epoch timestamp').exists().isNumeric().matches(/^\d{10,10}$/)
      req.checkBody('pubkey', 'pubkey is the 66 character public key associated with your ResDEX account').exists().matches(/^\w{66,66}$/)
      break
    }
    case 'verityDeposit': {
      req.checkBody('address', 'this must be the address where you deposited your RES').exists().matches(/^\w{35,35}$/)
      req.checkBody('redeemScript', 'the script of the contract that you deposited to').exists().matches(/^\w{0,500}$/) // this needs to be restricted
      break
    }
    case 'verifyScript': {
      req.checkBody('address', 'the p2sh address you are verifying').exists()
      req.checkBody('script', 'the buffer of the script you are verifying').exists()
      break
    }
    default: {
      break
    }
  }
  return req.validationErrors()
}
