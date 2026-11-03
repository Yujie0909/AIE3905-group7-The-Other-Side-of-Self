export class Failure extends Error {
 constructor(status,code){super(code);this.status=status;this.code=code}
}
export function fail(status,code){throw new Failure(status,code)}
