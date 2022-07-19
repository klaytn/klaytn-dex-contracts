module.exports = {
    skipFiles: ['libraries/UQ112x112.sol',
                'interfaces/',
                'utils/',
                'tokens/KIP7.sol',
                'tokens/TestToken.sol',
                'tokens/WKLAY.sol',
                'tokens/extensions/KIP7Votes.sol',
                'tokens/extensions/draft-KIP7Permit.sol',
                'mocks/DeflatingKIP7.sol',
                'mocks/DexKIP7Test.sol',
                'mocks/KIP7TestMock.sol',
                'farming/MultiCall.sol',
                ],
    configureYulOptimizer: false,
    mocha: {
      grep: "@skip-on-coverage", // Find everything with this tag
      invert: true               // Run the grep's inverse set.
    },
    enableTimeouts: false,
  };