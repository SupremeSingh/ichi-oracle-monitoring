const BANNERS = {
  '0': {
    image: "https://ichi-images.s3.amazonaws.com/banners/bg_purple.png",
    countdown: '',
    textBase: 'Add liquidity to Angel Vaults and stake your LP to earn ICHI rewards now!',
    textCountdown: '',
    buttons: [
      { 
        label: 'Stake',
        link: '/vault?poolId=1016&back=vault' 
      },
      { 
        label: 'Learn More',
        link: 'https://docs.ichi.farm/earn-yield/angel-vaults' 
      }
    ],
    baseColor: '#751F95',
    gradientDirection: '',
    gradientColor0: '#751F95',
    gradientColor1: '#0676FF'
  },
  '1': {
    image: "https://ichi-images.s3.amazonaws.com/banners/bg_blue.png",
    countdown: '1639497600000',
    textBase: 'Rewards for oneWING (new) Deposits are now live!',
    textCountdown: "oneWING (new) is now live on ICHI v2! Deposit Rewards begin in:",
    buttons: [
      { 
        label: 'Mint',
        link: '/mint?name=onewing&collateral=USDC' 
      },
      { 
        label: 'Learn More',
        link: 'https://docs.ichi.farm/earn-yield/deposit' 
      }
    ],
    baseColor: '#0676FF',
    gradientDirection: '',
    gradientColor0: '#751F95',
    gradientColor1: '#0676FF'
  },
  '2': {
    image: "https://ichi-images.s3.amazonaws.com/banners/bg_olympus.png",
    countdown: '',
    textBase: 'Olympus bonds are now LIVE - get ICHI at a discount for your Angel Vault LP',
    textCountdown: '',
    buttons: [
      { 
        label: 'Bond',
        link: 'https://pro.olympusdao.finance/#/bond/oneuni_ichi_ichi' 
      }
    ],
    baseColor: '#0676FF',
    gradientDirection: '',
    gradientColor0: '#751F95',
    gradientColor1: '#0676FF'
  }
}

export { BANNERS };
