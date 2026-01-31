/**
 * IPC 에러 여부를 확인하는 타입 가드 함수
 * @param value - 확인할 값
 * @returns value가 IpcError이면 true
 */
export function isIpcError(value: unknown): value is IpcError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    (value as IpcError).error === true &&
    'message' in value &&
    typeof (value as IpcError).message === 'string' &&
    'handlerName' in value &&
    typeof (value as IpcError).handlerName === 'string'
  )
}
