import { POOLS as MAINNET_POOLS } from '../configMainnet';
import { POOLS as KOVAN_POOLS } from '../kovan/configKovan';
import { POOLS as MUMBAI_POOLS } from '../mumbai/configMumbai';

export function isFarmV1(pid: number): boolean {
    return pid >= 0 && pid < 1000;
};

export function isFarmV2(pid: number): boolean {
    return pid >= 1000 && pid < 5000;
};

export function isFarmV2Kovan(pid: number): boolean {
    return pid >= 5000 && pid < 6000;
};

export function isFarmV2Mumbai(pid: number): boolean {
    return pid >= 6000 && pid < 7000;
};

export function isFarmGeneric(pid: number): boolean {
    return pid >= 20000 && pid < 30000;
};

export function isFarmExternal(pid: number): boolean {
    return pid >= 10000 && pid < 20000;
};

export function isUnretired(pid: number): boolean {
    return (pid in MAINNET_POOLS.unretiredPools) ||
    (pid in MUMBAI_POOLS.unretiredPools) ||
    (pid in KOVAN_POOLS.unretiredPools);
};

export function adjustedPid(pid: number): number {
    if (pid >= 0 && pid < 1000) return pid;
    if (pid >= 1000 && pid < 2000) return (pid - 1000);
    if (pid >= 5000 && pid < 6000) return (pid - 5000);
    if (pid >= 6000 && pid < 7000) return (pid - 6000);
    if (pid >= 10000 && pid < 20000) return (pid - 10000);
    if (pid >= 20000 && pid < 30000) return (pid - 20000);

    return pid;
};

export function adjustedPidString(pid: number): string {
    return Number(adjustedPid(pid)).toString();
};
