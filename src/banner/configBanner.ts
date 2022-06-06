const BANNERS = {
  '0': {
    image: 'https://ichi-images.s3.amazonaws.com/banners/bg_goal_reached.png',
    countdown: '1654095600000',
    textBase: 'Liquidity is back - deposit to vaults and earn!',
    textCountdown: 'We have reached our goal! Commencing liquidity rebalance in:',
    buttons: [
      {
        label: 'Deposit',
        link: '/vault'
      },
      {
        label: 'Learn More',
        link: 'https://medium.com/ichifarm/ichi-stronger-crypto-economies-through-sustainable-liquidity-9b138887e523'
      }
    ],
    baseColor: '#333333',
    gradientDirection: '120deg',
    gradientColor0: '#555354',
    gradientColor1: '#2c2c2c'
  },
  '1': {
    image: 'https://ichi-images.s3.amazonaws.com/banners/bg_ichi_relaunch.png',
    countdown: '1646402400000',
    textBase: 'The ICHI Launch is here with lots of new improvements!',
    textCountdown: '',
    buttons: [
      {
        label: 'Deposit',
        link: '/hodlvault'
      },
      {
        label: 'Learn More',
        link: 'https://medium.com/ichifarm/ichi-stronger-crypto-economies-through-sustainable-liquidity-9b138887e523'
      }
    ],
    baseColor: '#cd679e',
    gradientDirection: 'to right',
    gradientColor0: '#f0808b',
    gradientColor1: '#550fe0'
  },
  '2': {
    image: 'https://ichi-images.s3.amazonaws.com/banners/bg_vault_qredo.png',
    countdown: '1646402400000',
    textBase: 'QRDO Angel Vault is now live! Deposit USDC and earn.',
    textCountdown: '',
    buttons: [
      {
        label: 'Deposit',
        link: '/vault?poolId=20005&back=vault'
      },
      {
        label: 'Learn More',
        link: 'https://medium.com/ichifarm/ichi-stronger-crypto-economies-through-sustainable-liquidity-9b138887e523'
      }
    ],
    baseColor: '#0f0e2a',
    gradientDirection: 'to right',
    gradientColor0: '#0f0e2a',
    gradientColor1: '#51144a'
  },
  '3': {
    image: 'https://ichi-images.s3.amazonaws.com/banners/bg_polygon.png',
    countdown: '1646402400000',
    textBase: 'ICHI is going Multi-Chain! Bridge $ICHI and deposit to new Polygon Angel Vaults!',
    textCountdown: '',
    buttons: [
      {
        label: 'Deposit',
        link: '/vault?poolId=4000&back=vault'
      },
      {
        label: 'Learn More',
        link: 'https://medium.com/ichifarm/ichi-goes-cross-chain-with-launch-on-polygon-756a84f412ef'
      }
    ],
    baseColor: '#4c278b',
    gradientDirection: '',
    gradientColor0: '#8743ff',
    gradientColor1: '#4c278b'
  }
};

export { BANNERS };
