import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold, Italic, List, ListOrdered, Heading1, Heading2,
  Quote, Code, Link as LinkIcon, CheckSquare, Undo, Redo,
} from "lucide-react";

interface RichEditorProps {
  content: any;
  onChange: (json: any) => void;
  placeholder?: string;
  editable?: boolean;
}

export const RichEditor = ({ content, onChange, placeholder, editable = true }: RichEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: true, autolink: true, HTMLAttributes: { class: "text-primary underline" } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: placeholder || "Start writing..." }),
    ],
    content: content && Object.keys(content).length > 0 ? content : "",
    editable,
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] px-3 py-2",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getJSON();
    if (JSON.stringify(current) !== JSON.stringify(content)) {
      editor.commands.setContent(content && Object.keys(content).length > 0 ? content : "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, editor]);

  if (!editor) return null;

  const setLink = () => {
    const previous = editor.getAttributes("link").href;
    const url = window.prompt("URL", previous || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url, target: "_blank" }).run();
  };

  return (
    <div className="border rounded-md bg-background">
      {editable && (
        <div className="flex flex-wrap gap-1 p-1 border-b">
          <Button type="button" size="icon" variant={editor.isActive("bold") ? "secondary" : "ghost"} className="h-8 w-8" onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></Button>
          <Button type="button" size="icon" variant={editor.isActive("italic") ? "secondary" : "ghost"} className="h-8 w-8" onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></Button>
          <Button type="button" size="icon" variant={editor.isActive("heading", { level: 1 }) ? "secondary" : "ghost"} className="h-8 w-8" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="h-4 w-4" /></Button>
          <Button type="button" size="icon" variant={editor.isActive("heading", { level: 2 }) ? "secondary" : "ghost"} className="h-8 w-8" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></Button>
          <Button type="button" size="icon" variant={editor.isActive("bulletList") ? "secondary" : "ghost"} className="h-8 w-8" onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></Button>
          <Button type="button" size="icon" variant={editor.isActive("orderedList") ? "secondary" : "ghost"} className="h-8 w-8" onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></Button>
          <Button type="button" size="icon" variant={editor.isActive("taskList") ? "secondary" : "ghost"} className="h-8 w-8" onClick={() => editor.chain().focus().toggleTaskList().run()}><CheckSquare className="h-4 w-4" /></Button>
          <Button type="button" size="icon" variant={editor.isActive("blockquote") ? "secondary" : "ghost"} className="h-8 w-8" onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="h-4 w-4" /></Button>
          <Button type="button" size="icon" variant={editor.isActive("codeBlock") ? "secondary" : "ghost"} className="h-8 w-8" onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Code className="h-4 w-4" /></Button>
          <Button type="button" size="icon" variant={editor.isActive("link") ? "secondary" : "ghost"} className="h-8 w-8" onClick={setLink}><LinkIcon className="h-4 w-4" /></Button>
          <div className="flex-1" />
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => editor.chain().focus().undo().run()}><Undo className="h-4 w-4" /></Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => editor.chain().focus().redo().run()}><Redo className="h-4 w-4" /></Button>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
};
