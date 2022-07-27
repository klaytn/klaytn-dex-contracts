import { DexFactory } from '../../typechain/swap/DexFactory';
import { DexPair } from '../../typechain/swap/DexPair';
import { KIP7Mock } from '../../typechain/mocks/KIP7TestMock.sol/KIP7Mock';
import { DexRouter } from '../../typechain/swap/DexRouter';
import { WETH9 } from '../../typechain/tokens/WKLAY.sol/WETH9';

export interface FactoryFixture {
  factory: DexFactory
}

export interface PairFixture extends FactoryFixture {
  token0: KIP7Mock
  token1: KIP7Mock
  pair: DexPair
}

export interface RouterFixture {
  token0: KIP7Mock
  token1: KIP7Mock
  WKLAY: WETH9
  WKLAYPartner: KIP7Mock
  factory: DexFactory
  router: DexRouter
  pair: DexPair
  WKLAYPair: DexPair
}
