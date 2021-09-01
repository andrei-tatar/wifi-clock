export function uploadDigit(digit, data) {
    return fetch(`/api/file/${digit}`, {
        method: 'POST',
        body: data,
    });
}
