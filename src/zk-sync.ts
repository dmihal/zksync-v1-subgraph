import { BigInt, Bytes, crypto, log } from "@graphprotocol/graph-ts"
import { CommitBlocksCall, ZKSync } from "../generated/ZKSync/ZKSync"
import { Block, Transaction } from "../generated/schema"

export function handleCommitBlocks(call: CommitBlocksCall): void {
  let blocks = call.inputs._newBlocksData
  log.info("Num blocks: {}", [blocks.length.toString()])

  for (let i = 0; i < blocks.length; i += 1) {
    let block = blocks[i]

    let blockEntity = new Block(block.blockNumber.toString())
    blockEntity.data = block.publicData
    blockEntity.save()

    log.info("Block {}: {}", [block.blockNumber.toString(), block.publicData.toHex()])

    let data = block.publicData

    while (data.length > 0) {
      let byteZero = data[0]
      let type = byteZero.toString(16)
      let size = data.length

      if (byteZero == 0x00) {
        type = 'NoOp'
        size = 10
      } else if (byteZero == 0x01) {
        type = 'Undocumented Deposit'
        size = 54
      } else if (byteZero == 0x05) {
        type = 'Transfer'
        size = 18
      } else if (byteZero == 0x02) {
        type = 'TransferToNew'
        size = 54
      } else if (byteZero == 0x03) {
        type = 'Withdraw'
        size = 54
      } else if (byteZero == 0x0a) {
        type = 'Withdraw NFT'
      } else if (byteZero == 0x09) {
        type = 'Mint NFT'
        size = 50
      } else if (byteZero == 0xfe) {
        type = 'Deposit'
      } else if (byteZero == 0xf9) {
        type = 'Full Exit'
      } else if (byteZero == 0x07) {
        type = 'Change PubKey'
        size = 54
      } else if (byteZero == 0x08) {
        type = 'Forced Exit'
        size = 54
      } else if (byteZero == 0x0b) {
        type = 'Swap'
        size = 50
      }

      let txData = Bytes.fromUint8Array(data.slice(0, size))
      data = Bytes.fromUint8Array(data.slice(size))

      let hash = crypto.keccak256(txData)
      let txEntity = new Transaction(hash.toHex())
      txEntity.type = type
      txEntity.block = block.blockNumber.toString()
      txEntity.data = txData
      txEntity.save()
    }
  }
}
