import React, {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useCallback,
  useEffect,
} from 'react'
import { useWeb3React } from '../hooks/ethereum'

import {
  safeAccess,
  isAddress,
  getEtherBalance,
  getTokenBalance,
} from '../utils'
import { useBlockNumber } from './Application'

type BalancesContext = any[]

type BalancesState = {}

const UPDATE = 'UPDATE'

const BalancesContext = createContext<BalancesContext>([])

function useBalancesContext() {
  return useContext(BalancesContext)
}

function reducer(state: BalancesState, { type, payload }: { type: 'UPDATE', payload: any }): BalancesState {
  switch (type) {
    case UPDATE: {
      const { chainId, address, tokenAddress, value, blockNumber } = payload
      return {
        ...state,
        [chainId]: {
          ...(safeAccess(state, [chainId]) || {}),
          [address]: {
            ...(safeAccess(state, [chainId, address]) || {}),
            [tokenAddress]: {
              value,
              blockNumber,
            },
          },
        },
      }
    }
    default: {
      throw Error(
        `Unexpected action type in BalancesContext reducer: '${type}'.`,
      )
    }
  }
}

export default function Provider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {})

  const update = useCallback(
    (chainId, address, tokenAddress, value, blockNumber) => {
      dispatch({
        type: UPDATE,
        payload: { chainId, address, tokenAddress, value, blockNumber },
      })
    },
    [],
  )

  return (
    <BalancesContext.Provider
      value={useMemo(() => [state, { update }], [state, update])}
    >
      {children}
    </BalancesContext.Provider>
  )
}

export function useAddressBalance(tokenAddress: string, address: string) {
  const { library, chainId } = useWeb3React()
  const globalBlockNumber = useBlockNumber()

  const [state, { update }] = useBalancesContext()
  const { value, blockNumber } =
    safeAccess(state, [chainId as number, address, tokenAddress]) || {}

  useEffect(() => {
    if (
      isAddress(address) &&
      (tokenAddress === 'ETH' || isAddress(tokenAddress)) &&
      globalBlockNumber &&
      (value === undefined || blockNumber !== globalBlockNumber) &&
      (chainId || chainId === 0) &&
      library
    ) {
      let stale = false
      ;(tokenAddress === 'ETH'
        ? getEtherBalance(address, library)
        : getTokenBalance(tokenAddress, address, library)
      )
        .then((value) => {
          if (!stale) {
            update(chainId, address, tokenAddress, value, globalBlockNumber)
          }
        })
        .catch(() => {
          if (!stale) {
            update(chainId, address, tokenAddress, null, globalBlockNumber)
          }
        })
      return () => {
        stale = true
      }
    }
  }, [
    address,
    tokenAddress,
    value,
    blockNumber,
    globalBlockNumber,
    chainId,
    library,
    update,
  ])

  return value
}
