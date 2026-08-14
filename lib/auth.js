export function isAuthorized(opts) {
    if (opts.allowAllUsers)
        return true;
    if (opts.userId === undefined)
        return false;
    return opts.allowedUserIds.includes(opts.userId);
}
