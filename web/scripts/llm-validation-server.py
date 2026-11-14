"""외부 LLM 검증 서버. 설정·호출 성공 여부만 기록하고 키·원문 요청은 기록하지 않는다."""
import argparse
import json
import sys
import time
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--workspace", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--port", type=int, default=18003)
    parser.add_argument("--answer-mode", choices=["llm", "template"])
    args = parser.parse_args()
    sys.path.insert(0, args.workspace)
    from AI.src.config import settings
    from AI.src.llm.client import OpenAICompatClient, LLMUnavailableError
    from AI.src.llm.orchestrator import ChatOrchestrator
    from AI.src.api.app import create_app
    import uvicorn

    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=True)

    class MeasuredClient(OpenAICompatClient):
        def complete(self, messages, tools):
            started = time.perf_counter()
            entry = {"success": False}
            try:
                reply = super().complete(messages, tools)
                entry.update(success=True, tools=[call.name for call in reply.tool_calls])
                return reply
            except LLMUnavailableError as error:
                entry["error_kind"] = error.kind
                raise
            finally:
                entry["latency_ms"] = round((time.perf_counter() - started) * 1000)
                with (out / "gateway-calls.jsonl").open("a", encoding="utf-8") as stream:
                    stream.write(json.dumps(entry) + "\n")

    client = MeasuredClient.from_settings()
    if not client.api_key:
        raise SystemExit("선택된 제공자의 API 키가 설정되지 않았습니다.")
    orchestrator = ChatOrchestrator(client=client, answer_mode=args.answer_mode)
    (out / "config.json").write_text(json.dumps({
        "provider": settings.LLM_PROVIDER, "model": client.model,
        "timeout_seconds": client.timeout_seconds, "preresolve": orchestrator.preresolve,
        "answer_mode": orchestrator.answer_mode, "key_configured": True,
    }, indent=2), encoding="utf-8")
    uvicorn.run(create_app(orchestrator=orchestrator), host="127.0.0.1", port=args.port)


if __name__ == "__main__":
    main()
