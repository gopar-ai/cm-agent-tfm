'use client';

import { parsePost, parseTopics, parseAngle, parseVersions, Topic } from '@/lib/post-parser';
import { hashContent } from '@/lib/version-edit-state';
import PostCard from './PostCard';
import TopicsList from './TopicsList';
import AngleCard from './AngleCard';
import VersionsCompare from './VersionsCompare';

type Props = {
  role: 'user' | 'assistant';
  content: string;
  chatId: string;
  onSavePost?: (post: { titular: string; cuerpo: string; hashtags: string; promptImagen: string }) => void;
  onSelectTopic?: (topic: Topic) => void;
  onSelectFormat?: (format: string) => void;
  onConfirmVersion?: (choice: 'A' | 'B', content: string, titulares: string[]) => void;
  disabled?: boolean;
};

export default function ChatMessage({
  role,
  content,
  chatId,
  onSavePost,
  onSelectTopic,
  onSelectFormat,
  onConfirmVersion,
  disabled,
}: Props) {
  const isUser = role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="bg-zinc-800 text-white rounded-xl rounded-tr-sm px-4 py-3 max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      </div>
    );
  }

  const post = parsePost(content);
  if (post) {
    return (
      <div className="flex justify-start mb-4 w-full">
        <PostCard post={post} onSave={onSavePost} />
      </div>
    );
  }

  const versions = parseVersions(content);
  if (versions && onConfirmVersion) {
    return (
      <div className="flex justify-start mb-4 w-full">
        <VersionsCompare
          stateId={`${chatId}:${hashContent(content)}`}
          versions={versions}
          onConfirm={onConfirmVersion}
          disabled={disabled}
        />
      </div>
    );
  }

  const angle = parseAngle(content);
  if (angle && onSelectFormat) {
    return (
      <div className="flex justify-start mb-4 w-full">
        <AngleCard angle={angle} onSelectFormat={onSelectFormat} disabled={disabled} />
      </div>
    );
  }

  const topicsResult = parseTopics(content);
  if (topicsResult) {
    return (
      <div className="flex justify-start mb-4 w-full">
        <TopicsList
          topics={topicsResult.topics}
          closingText={topicsResult.closingText}
          onSelect={onSelectTopic}
          disabled={disabled}
        />
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-4">
      <div className="bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl rounded-tl-sm px-4 py-3 max-w-[85%] text-sm leading-relaxed whitespace-pre-wrap">
        {content}
      </div>
    </div>
  );
}
