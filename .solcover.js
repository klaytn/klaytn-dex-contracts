module.exports = {
    skipFiles: ['libraries/UQ112x112.sol',
                'interfaces/',
                'utils/',
                'tokens/KIP7.sol',
                'tokens/TestToken.sol',
                'tokens/WKLAY.sol',
                'mocks/',
                ],
    configureYulOptimizer: false,
    mocha: {
      grep: "@skip-on-coverage", // Find everything with this tag
      invert: true               // Run the grep's inverse set.
    },
    enableTimeouts: false,
  };