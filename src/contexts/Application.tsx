import React, {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useCallback,
  useEffect,
} from 'react'
import { useWeb3React } from '../hooks/ethereum'
import { safeAccess } from '../utils'

const BLOCK_NUMBER = 'BLOCK_NUMBER'
const UPDATE_BLOCK_NUMBER = 'UPDATE_BLOCK_NUMBER'

type ApplicationContext = any[]

type ApplicationState = {}

const ApplicationContext = createContext<ApplicationContext>([])

function useApplicationContext() {
  return useContext(ApplicationContext)
}

function reducer(state: ApplicationState, { type, payload }: { type: 'UPDATE_BLOCK_NUMBER', payload: any }) {
  switch (type) {
    case UPDATE_BLOCK_NUMBER: {
      const { chainId, blockNumber } = payload
      return {
        ...state,
        [BLOCK_NUMBER]: {
          ...(safeAccess(state, [BLOCK_NUMBER]) || {}),
          [chainId]: blockNumber,
        },
      }
    }
    default: {
      throw Error(
        `Unexpected action type in ApplicationContext reducer: '${type}'.`,
      )
    }
  }
}

export default function Provider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    [BLOCK_NUMBER]: {},
  })

  const updateBlockNumber = useCallback((chainId, blockNumber) => {
    dispatch({ type: UPDATE_BLOCK_NUMBER, payload: { chainId, blockNumber } })
  }, [])

  return (
    <ApplicationContext.Provider
      value={useMemo(() => [state, { updateBlockNumber }], [
        state,
        updateBlockNumber,
      ])}
    >
      {children}
    </ApplicationContext.Provider>
  )
}

export function Updater() {
  const { library, chainId } = useWeb3React()

  const [, { updateBlockNumber }] = useApplicationContext()

  // update block number
  useEffect(() => {
    if (library) {
      let stale = false

      const updateBlock = (blockNumber: number) => {
        if (!stale) {
          updateBlockNumber(chainId, blockNumber)
        }
      }

      library.on('block', updateBlock)

      return () => {
        stale = true
        library.removeListener('block', updateBlock)
      }
    }
  }, [chainId, library, updateBlockNumber])

  return null
}

export function useBlockNumber() {
  const { chainId } = useWeb3React()

  const [state] = useApplicationContext()

  return safeAccess(state, [BLOCK_NUMBER, chainId as number])
}
