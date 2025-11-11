import React, { useEffect, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import DOMPurify from 'dompurify';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Heading1,
  Heading2,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Palette,
  Quote,
  UnderlineIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string, plainText: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder = 'Write your update...' }: RichTextEditorProps) {
  const [color, setColor] = useState('#111827');
  const [colorOpen, setColorOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      Color.configure({ types: ['textStyle'] }),
      TextStyle,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '<p></p>',
    editorProps: {
      attributes: {
        class:
          'tiptap prose prose-sm max-w-none focus:outline-none text-sm sm:text-base leading-relaxed',
      },
    },
    onUpdate: ({ editor: instance }) => {
      const html = instance.getHTML();
      const sanitized = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
      onChange(sanitized, instance.getText());
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '<p></p>');
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <div className="rounded-xl border bg-background/60 p-4 text-sm text-muted-foreground">
        Loading editor…
      </div>
    );
  }

  const applyHeading = (level: 1 | 2) => {
    editor.chain().focus().toggleHeading({ level }).run();
  };

  const addLink = () => {
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Enter URL', previousUrl ?? 'https://');

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const handleColorChange = (next: string) => {
    setColor(next);
    editor.chain().focus().setColor(next).run();
  };

  const isActive = (name: string, attrs?: Record<string, unknown>) => editor.isActive(name, attrs);

  return (
    <div className="space-y-3">
      <TooltipProvider>
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 p-2">
          <ToolbarButton
            icon={Bold}
            label="Bold"
            isActive={isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          />
          <ToolbarButton
            icon={Italic}
            label="Italic"
            isActive={isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          />
          <ToolbarButton
            icon={UnderlineIcon}
            label="Underline"
            isActive={isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          />
          <ToolbarButton
            icon={Heading1}
            label="Heading 1"
            isActive={isActive('heading', { level: 1 })}
            onClick={() => applyHeading(1)}
          />
          <ToolbarButton
            icon={Heading2}
            label="Heading 2"
            isActive={isActive('heading', { level: 2 })}
            onClick={() => applyHeading(2)}
          />
          <ToolbarButton
            icon={List}
            label="Bullet list"
            isActive={isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          />
          <ToolbarButton
            icon={ListOrdered}
            label="Numbered list"
            isActive={isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          />
          <ToolbarButton
            icon={Quote}
            label="Quote"
            isActive={isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          />
          <ToolbarButton icon={LinkIcon} label="Link" isActive={isActive('link')} onClick={addLink} />

          <Popover open={colorOpen} onOpenChange={setColorOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  'h-8 w-8 rounded-full p-0',
                  editor.isActive('textStyle', { color }) && 'bg-primary/10 text-primary',
                )}
                aria-label="Text color"
              >
                <Palette className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px]">
              <HexColorPicker color={color} onChange={handleColorChange} />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{color.toUpperCase()}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setColor('#111827');
                    editor.chain().focus().unsetColor().run();
                  }}
                >
                  Reset
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </TooltipProvider>

      <div className="rounded-2xl border bg-background p-4 shadow-sm">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  isActive,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive?: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClick}
          className={cn(
            'h-8 w-8 rounded-full p-0 text-foreground/70 hover:text-foreground',
            isActive && 'bg-primary/10 text-primary shadow-sm',
          )}
          aria-label={label}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
