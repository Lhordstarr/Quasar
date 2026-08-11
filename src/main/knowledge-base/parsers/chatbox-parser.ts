import type { DocumentParserType } from '../../../shared/types/settings'
import { parseFileRemotely } from '../remote-file-parser'
import type { DocumentParser, ParserFileMeta } from './types'

/**
 * Chatbox AI document parser
 * Uses Chatbox AI backend for cloud-based document parsing
 * Requires user to be logged in (has valid license key)
 *
 * Legacy parser kept for reference: no longer selectable through the
 * DocumentParserConfig type. The value is retained so historical records
 * that reference this parser type remain readable.
 */
export class ChatboxParser implements DocumentParser {
  readonly type: DocumentParserType = 'chatbox-ai' as unknown as DocumentParserType

  async parse(filePath: string, meta: ParserFileMeta): Promise<string> {
    // Use the existing remote file parser implementation
    return await parseFileRemotely(filePath, meta.filename, meta.mimeType)
  }
}
