'use client'

import {
  ChatBox,
  ChatConversationList,
  type ChatConversationListProps,
  ChatMessageAvatar,
  type ChatMessageAvatarProps,
} from '@mui/x-chat'
import { useChat, useChatStore } from '@mui/x-chat-headless'
import type { ConversationListItemAvatarProps } from '@mui/x-chat-headless'
import { useMessageContext } from '@mui/x-chat-headless/message'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import CloseIcon from '@mui/icons-material/Close'
import {
  Avatar,
  Box,
  Button,
  Drawer,
  Fab,
  IconButton,
  Typography,
  useTheme,
} from '@mui/material'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { useLingui } from '@lingui/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getRuntimeChatConfig } from '@/utils/runtimeChatConfig'
import { createAiChatAdapter } from './aiChat/aiChatAdapter'

const DRAWER_WIDTH = 'min(420px, 100vw)'

const MessageAvatar = (props: ChatMessageAvatarProps) => {
  const { role } = useMessageContext()
  if (role === 'assistant') {
    return (
      <Avatar
        className={props.className}
        src='/icons/picto-crisalid-assistant.svg'
        alt={t`ai_chat_assistant_avatar_alt`}
        sx={{
          bgcolor: 'common.white',
          border: '1px solid',
          borderColor: 'divider',
          '& img': {
            objectFit: 'contain',
            padding: '1px',
          },
        }}
      />
    )
  }
  if (role === 'user') {
    return (
      <Avatar
        className={props.className}
        src='/icons/avatar.png'
        alt={t`ai_chat_user_avatar_alt`}
      />
    )
  }
  return <ChatMessageAvatar {...props} />
}

// Every conversation gets a "multiple messages" icon avatar in the list.
const ConversationAvatar = ({ className }: ConversationListItemAvatarProps) => (
  <Avatar
    className={className}
    sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}
  >
    <ForumOutlinedIcon fontSize='small' />
  </Avatar>
)

// The `conversationList` slot: renders inside the ChatProvider, so it can use
// the store to create a new conversation. Creating + activating a conversation
// opens an empty thread (composer + back arrow) in split layout.
const ConversationsPane = (props: ChatConversationListProps) => {
  const store = useChatStore()
  const handleNew = () => {
    const id = crypto.randomUUID()
    store.addConversation({ id, title: t`ai_chat_new_conversation` })
    store.setActiveConversation(id)
  }
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ flexGrow: 1, minHeight: 0 }}>
        <ChatConversationList
          {...props}
          slots={{ ...props.slots, itemAvatar: ConversationAvatar }}
        />
      </Box>
      <Box
        sx={{
          px: 2,
          py: 3,
          display: 'flex',
          justifyContent: 'center',
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <Button
          variant='contained'
          startIcon={<AddCircleOutlineIcon />}
          onClick={handleNew}
          sx={{ px: 3, py: 1 }}
        >
          {t`ai_chat_new_conversation`}
        </Button>
      </Box>
    </Box>
  )
}

// Rendered as a child of ChatBox (inside the provider). Discards a conversation
// the user opened but left without ever sending a message, so abandoned "New
// conversation" entries do not linger in the list.
const NewConversationLifecycle = () => {
  const { activeConversationId, messages } = useChat()
  const store = useChatStore()
  const previous = useRef({
    id: activeConversationId,
    count: messages.length,
  })
  useEffect(() => {
    const prev = previous.current
    if (prev.id && prev.id !== activeConversationId && prev.count === 0) {
      store.removeConversation(prev.id)
    }
    previous.current = { id: activeConversationId, count: messages.length }
  }, [activeConversationId, messages.length, store])
  return null
}

// Derive a conversation's title from its first user message, once, replacing the generic
// "New conversation" placeholder. Guarded so it never overwrites a seeded title (e.g. Welcome).
const ConversationTitleSync = () => {
  const { activeConversationId, messages, conversations } = useChat()
  const store = useChatStore()
  const placeholder = t`ai_chat_new_conversation`
  useEffect(() => {
    if (!activeConversationId) return
    const conversation = conversations.find(
      (item) => item.id === activeConversationId,
    )
    if (!conversation) return
    if (conversation.title && conversation.title !== placeholder) return
    const firstUser = messages.find((message) => message.role === 'user')
    const text = firstUser
      ? firstUser.parts
          .map((part) => (part.type === 'text' ? part.text : ''))
          .join('')
          .trim()
      : ''
    if (!text) return
    store.updateConversation(activeConversationId, { title: text.slice(0, 60) })
  }, [activeConversationId, conversations, messages, store, placeholder])
  return null
}

const AiChatWidget = () => {
  const theme = useTheme()
  // Subscribe to locale changes so localised strings re-render on switch.
  useLingui()
  const [open, setOpen] = useState(false)

  // Welcome seed, suggestions and the enable flag come from the runtime chat config injected by
  // the layout (sourced from configs/chat.json). The reference is stable within a mount and the
  // widget remounts on locale change (route change), so the memos pick up the right locale.
  const chatConfig = getRuntimeChatConfig()

  const adapter = useMemo(
    () =>
      createAiChatAdapter({
        seed: chatConfig.welcome
          ? [
              {
                id: 'welcome',
                title: chatConfig.welcome.title,
                messages: [
                  { role: 'assistant', text: chatConfig.welcome.message },
                ],
              },
            ]
          : [],
      }),
    [chatConfig.welcome],
  )

  const localeText = useMemo(() => {
    // Message-status and tool-state labels are function-valued in the library; build lookup maps
    // of static `t` ids the extractor can see, then map the incoming key.
    const statusLabels: Record<string, string> = {
      pending: t`ai_chat_status_pending`,
      sending: t`ai_chat_status_sending`,
      streaming: t`ai_chat_status_streaming`,
      sent: t`ai_chat_status_sent`,
      read: t`ai_chat_status_read`,
      error: t`ai_chat_status_error`,
      cancelled: t`ai_chat_status_cancelled`,
    }
    const toolStateLabels: Record<string, string> = {
      'input-streaming': t`ai_chat_tool_running`,
      'input-available': t`ai_chat_tool_running`,
      'approval-requested': t`ai_chat_tool_awaiting_approval`,
      'approval-responded': t`ai_chat_tool_running`,
      'output-available': t`ai_chat_tool_completed`,
      'output-error': t`ai_chat_tool_failed`,
      'output-denied': t`ai_chat_tool_denied`,
    }
    return {
      composerInputPlaceholder: t`ai_chat_composer_placeholder`,
      composerInputAriaLabel: t`ai_chat_composer_aria_label`,
      composerSendButtonLabel: t`ai_chat_composer_send_label`,
      messageAuthorUserLabel: t`ai_chat_author_user`,
      messageAuthorAssistantLabel: t`ai_chat_author_assistant`,
      conversationHeaderBackLabel: t`ai_chat_back_to_conversations`,
      retryButtonLabel: t`ai_chat_retry_label`,
      reconnectButtonLabel: t`ai_chat_reconnect_label`,
      loadingLabel: t`ai_chat_loading_label`,
      genericErrorLabel: t`ai_chat_generic_error_label`,
      scrollToBottomLabel: t`ai_chat_scroll_to_bottom_label`,
      suggestionsLabel: t`ai_chat_suggestions_label`,
      threadNoMessagesLabel: t`ai_chat_thread_empty_label`,
      threadNoMessagesHelperText: t`ai_chat_thread_empty_helper`,
      conversationListNoConversationsLabel: t`ai_chat_no_conversations_label`,
      conversationListSearchPlaceholder: t`ai_chat_search_conversations_placeholder`,
      unreadMarkerLabel: t`ai_chat_unread_marker_label`,
      messageCopyButtonLabel: t`ai_chat_copy_label`,
      messageCopyCodeButtonLabel: t`ai_chat_copy_code_label`,
      messageCopiedCodeButtonLabel: t`ai_chat_copied_label`,
      messageToolInputLabel: t`ai_chat_tool_called_label`,
      messageToolOutputLabel: t`ai_chat_tool_result_label`,
      messageReasoningLabel: t`ai_chat_reasoning_label`,
      messageReasoningStreamingLabel: t`ai_chat_reasoning_streaming_label`,
      messageStatusLabel: (status: string) => statusLabels[status] ?? status,
      toolStateLabel: (state: string) => toolStateLabels[state] ?? state,
    }
  }, [])

  const suggestions = useMemo(
    () => chatConfig.suggestions,
    [chatConfig.suggestions],
  )

  // Only surface the assistant when a Crisalid Agents API endpoint is configured server-side
  // (the layout resolves this into `enabled`); without it there is no backend to talk to.
  if (!chatConfig.enabled) {
    return null
  }

  return (
    <>
      {!open && (
        <Fab
          color='primary'
          aria-label={t`ai_chat_open_label`}
          onClick={() => setOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: theme.zIndex.drawer + 1,
          }}
        >
          <ChatBubbleOutlineIcon />
        </Fab>
      )}

      <Drawer
        anchor='right'
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: DRAWER_WIDTH,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            },
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1.5,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant='h6' component='h2'>
            <Trans id='ai_chat_title'>Assistant</Trans>
          </Typography>
          <IconButton
            edge='end'
            aria-label={t`ai_chat_close_label`}
            onClick={() => setOpen(false)}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
          <ChatBox
            adapter={adapter}
            variant='default'
            layoutMode='split'
            features={{ conversationList: true, attachments: false }}
            suggestions={suggestions}
            suggestionsAutoSubmit
            localeText={localeText}
            slots={{
              messageAvatar: MessageAvatar,
              conversationList: ConversationsPane,
            }}
            slotProps={{
              suggestions: {
                sx: {
                  '&:not([data-empty])': {
                    flexWrap: 'wrap',
                    overflowX: 'visible',
                    justifyContent: 'center',
                    '& .MuiChatSuggestions-item': { flex: '0 1 auto' },
                  },
                },
              },
            }}
            sx={{ height: '100%' }}
          >
            <NewConversationLifecycle />
            <ConversationTitleSync />
          </ChatBox>
        </Box>
      </Drawer>
    </>
  )
}

export default AiChatWidget
