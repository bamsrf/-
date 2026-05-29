#!/bin/bash
# PreToolUse hook на Read: блокирует чтение огромных файлов целиком.
# Подталкивает Claude использовать grep/head/tail вместо вычитывания 10K строк в контекст.

# Читаем JSON ввод
INPUT=$(cat)

# Извлекаем file_path из tool_input
FILE_PATH=$(echo "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null)

# Если нет пути или файла — пропускаем
if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
  echo '{}'
  exit 0
fi

# Проверяем размер и количество строк
SIZE_BYTES=$(stat -f%z "$FILE_PATH" 2>/dev/null || stat -c%s "$FILE_PATH" 2>/dev/null || echo 0)

# Файлы > 500KB или > 5000 строк блокируем
if [ "$SIZE_BYTES" -gt 512000 ]; then
  LINES=$(wc -l < "$FILE_PATH" 2>/dev/null | tr -d ' ')
  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Файл $FILE_PATH = ${SIZE_BYTES} байт, $LINES строк. Не загружай целиком в контекст. Используй: Bash(grep -n 'pattern' '$FILE_PATH' | head -50), либо Read с offset/limit для конкретного диапазона."
  }
}
EOF
  exit 0
fi

# Для логов в любом случае предлагать grep
case "$FILE_PATH" in
  */logs/*|*.log|*.log.*)
    LINES=$(wc -l < "$FILE_PATH" 2>/dev/null | tr -d ' ')
    if [ "$LINES" -gt 200 ]; then
      cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Лог-файл $FILE_PATH ($LINES строк) лучше фильтровать: Bash(grep -E 'ERROR|WARN' '$FILE_PATH' | tail -50) или Bash(tail -200 '$FILE_PATH')."
  }
}
EOF
      exit 0
    fi
    ;;
esac

echo '{}'
