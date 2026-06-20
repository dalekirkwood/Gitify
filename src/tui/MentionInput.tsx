import { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";

const TOKEN = /(^|\s)@([\w.-]*)$/;

// ink-text-input ignores Up/Down/Tab, so the suggestion popup drives those with
// zero conflict; Enter is branched in onSubmit (accept while open, else submit).
export function MentionInput({
  value,
  onChange,
  onSubmit,
  onCancel,
  users,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  onCancel?: () => void;
  users: string[];
  label?: string;
}) {
  const [sel, setSel] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setSel(0);
    setDismissed(false);
  }, [value]);

  const m = value.match(TOKEN);
  const token = m ? m[2] : null;
  const suggestions =
    token === null ? [] : users.filter((u) => u.toLowerCase().includes(token.toLowerCase())).slice(0, 5);
  const open = !dismissed && suggestions.length > 0;
  const cur = Math.min(sel, suggestions.length - 1);

  // ponytail: only the trailing @token is replaced — earlier @mentions untouched.
  function accept(i: number) {
    const login = suggestions[i];
    if (!login) return;
    onChange(value.replace(TOKEN, `$1@${login} `));
  }

  useInput((_input, key) => {
    if (key.escape) {
      if (open) setDismissed(true);
      else onCancel?.();
      return;
    }
    if (!open) return;
    if (key.upArrow) setSel((s) => Math.max(0, s - 1));
    if (key.downArrow) setSel((s) => Math.min(suggestions.length - 1, s + 1));
    if (key.tab) accept(cur);
  });

  return (
    <Box flexDirection="column">
      <Box>
        {label ? <Text>{label}</Text> : null}
        <TextInput
          value={value}
          onChange={onChange}
          onSubmit={() => (open ? accept(cur) : onSubmit(value))}
        />
      </Box>
      {open
        ? suggestions.map((u, i) => (
            <Text
              key={u}
              color={i === cur ? "black" : "cyan"}
              backgroundColor={i === cur ? "cyan" : undefined}
            >
              {i === cur ? "▶ " : "  "}@{u}
            </Text>
          ))
        : null}
    </Box>
  );
}
