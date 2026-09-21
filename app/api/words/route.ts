import { addWord, deleteWord, listWords, recordCorrectAnswer, resetKnownWords, setWordExample } from "@/db/words";

function message(error: unknown) {
  if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) return "이미 추가한 단어야.";
  return error instanceof Error ? error.message : "처리 중 문제가 생겼어.";
}

export async function GET() {
  try {
    return Response.json({ words: await listWords() });
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = (await request.json()) as { word?: string; meaning?: string; note?: string; example?: string };
    const word = data.word?.trim() ?? "";
    const meaning = data.meaning?.trim() ?? "";
    const note = data.note?.trim() ?? "";
    const example = data.example?.trim() ?? "";
    if (!word || !meaning) return Response.json({ error: "영단어와 뜻을 모두 입력해줘." }, { status: 400 });
    if (word.length > 80 || meaning.length > 200 || note.length > 300 || example.length > 300) return Response.json({ error: "입력 내용이 너무 길어." }, { status: 400 });
    return Response.json({ word: await addWord({ word, meaning, note, example }) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id < 1) return Response.json({ error: "잘못된 단어 번호야." }, { status: 400 });
  try {
    await deleteWord(id);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const data = (await request.json()) as { action?: string; example?: string };
    if (data.action === "reset-known") {
      await resetKnownWords();
      return Response.json({ ok: true });
    }

    const id = Number(new URL(request.url).searchParams.get("id"));
    if (data.action === "set-example" && Number.isInteger(id) && id > 0) {
      const example = data.example?.trim() ?? "";
      if (!example || example.length > 300) return Response.json({ error: "예문을 확인해줘." }, { status: 400 });
      return Response.json({ word: await setWordExample(id, example) });
    }
    if (data.action !== "correct" || !Number.isInteger(id) || id < 1) {
      return Response.json({ error: "잘못된 요청이야." }, { status: 400 });
    }
    return Response.json({ word: await recordCorrectAnswer(id) });
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}
