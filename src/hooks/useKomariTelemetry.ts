import { useEffect, useState } from 'react';
import {
  fetchNodes, fetchSite, isPrivate, isUnavailable, realDataSource, verifySessionMe,
  type KomariDataSource, type TelemetrySnapshot,
} from '../api/komari';
import { resolveNodeGeo } from '../lib/geo-lookup';
import { getDaysUntilExpiry, parseRegion, parseTags } from '../lib/format';
import type { DataStatus, KomariClient, KomariEventItem, KomariNode, KomariSite, NetHistoryPoint } from '../types/komari';
import { subscribeTelemetry } from './telemetryTransport';

const SESSION_PERIOD = 30_000;
const MAX_EVENTS = 32;
const MAX_SAMPLES = 140;

interface Telemetry {
  site: KomariSite | null;
  loggedIn: boolean;
  nodes: KomariNode[];
  status: DataStatus;
  events: KomariEventItem[];
  networkHistory: NetHistoryPoint[];
  dataSource: KomariDataSource;
}

export function useKomariTelemetry(): Telemetry {
  const [state, setState] = useState<Telemetry>({
    site: null, loggedIn: false, nodes: [], status: 'loading', events: [], networkHistory: [], dataSource: realDataSource,
  });

  useEffect(() => {
    let site: KomariSite | null = null;
    let loggedIn = false;
    let sessionPending = false;
    let clients: Array<KomariClient & Pick<KomariNode, 'regionCode' | 'geo' | 'tagList'>> = [];
    let nodes: KomariNode[] = [];
    let snapshot: TelemetrySnapshot | undefined;
    let status: DataStatus = 'loading';
    let dataSource = realDataSource;
    let networkHistory: NetHistoryPoint[] = [];
    let events: KomariEventItem[] = [];
    let nextEventId = 1;
    const highLoad = new Set<string>();
    const expirations = new Map<string, string>();
    let stopped = false;
    let stopTransport: (() => void) | undefined;
    let validation: AbortController | undefined;
    let initial = true;
    let mock = false;

    function setClients(list: KomariClient[]) {
      clients = list.map(client => ({ ...client, regionCode: parseRegion(client.region), geo: resolveNodeGeo(client), tagList: parseTags(client.tags) }));
    }

    function publish() {
      const visible = loggedIn && !sessionPending;
      if (site?.private_site && sessionPending && (status === 'ready' || status === 'reconnecting')) {
        setState({ site, loggedIn: false, status: 'loading', nodes: [], events: [], networkHistory: [], dataSource });
        return;
      }
      setState({ site, loggedIn: visible, nodes, status, events, networkHistory, dataSource });
    }

    function clearTelemetry() {
      stopTransport?.();
      stopTransport = undefined;
      clients = [];
      snapshot = undefined;
      nodes = [];
      networkHistory = [];
      events = [];
      highLoad.clear();
      expirations.clear();
    }

    function clearExpirations() {
      expirations.clear();
      if (events.some(event => event.kind === 'expiring')) events = events.filter(event => event.kind !== 'expiring');
    }

    function updateNodes(frame: TelemetrySnapshot, recordNetwork: boolean) {
      const previous = new Map(nodes.map(node => [node.uuid, node]));
      const featured = new Set(site?.theme_settings.featured_nodes);
      const canShowPricing = loggedIn && !sessionPending && site?.theme_settings.show_pricing === true;
      if (!loggedIn || site?.theme_settings.show_pricing !== true) clearExpirations();
      const time = Date.now();
      const latestEvents: KomariEventItem[] = [];
      let up = 0;
      let down = 0;
      nodes = clients.map(client => {
        const prior = previous.get(client.uuid);
        const live = frame.get(client.uuid);
        const online = live?.online === true;
        const node: KomariNode = {
          ...client, ...live, online,
          featured: featured.has(client.uuid),
          ramTotal: live?.ramTotal || client.mem_total, swapTotal: live?.swapTotal || client.swap_total,
          diskTotal: live?.diskTotal || client.disk_total, diskUsed: live?.diskUsed ?? prior?.diskUsed,
          totalUp: live?.totalUp ?? prior?.totalUp, totalDown: live?.totalDown ?? prior?.totalDown,
          cpu: online ? live?.cpu : undefined, ramUsed: online ? live?.ramUsed : undefined,
          swapUsed: online ? live?.swapUsed : undefined,
          load: online ? live?.load : undefined, load5: online ? live?.load5 : undefined, load15: online ? live?.load15 : undefined,
          temp: online ? live?.temp : undefined, uptime: online ? live?.uptime : undefined,
          tcp: online ? live?.tcp : undefined, udp: online ? live?.udp : undefined, process: online ? live?.process : undefined,
          up: online ? live?.up : 0, down: online ? live?.down : 0,
          networkSampleTime: recordNetwork
            ? online && live?.up !== undefined && live.down !== undefined ? time : undefined
            : prior?.networkSampleTime,
        };
        up += node.up ?? 0;
        down += node.down ?? 0;
        const addEvent = (kind: KomariEventItem['kind'], isAlert: boolean, details?: Pick<KomariEventItem, 'cpu' | 'days'>) => {
          latestEvents.push({ id: nextEventId++, kind, nodeUuid: node.uuid, nodeName: node.name, regionCode: node.regionCode, time, isAlert, ...details });
        };
        if (online) {
          if (prior?.online === false) addEvent('online', false);
          if (node.cpu !== undefined && node.cpu >= 88 && !highLoad.has(node.uuid)) {
            highLoad.add(node.uuid);
            addEvent('high_load', true, { cpu: node.cpu });
          } else if (node.cpu !== undefined && node.cpu < 78 && highLoad.delete(node.uuid)) {
            addEvent('info', false, { cpu: node.cpu });
          }
        } else {
          if (!prior || prior.online) addEvent('offline', true);
          highLoad.delete(node.uuid);
        }
        if (canShowPricing) {
          const days = getDaysUntilExpiry(client.expired_at, time);
          if (client.expired_at && days !== null && days <= 7 && (days > 0 || Date.parse(client.expired_at) >= time)) {
            if (expirations.get(client.uuid) !== client.expired_at) addEvent('expiring', true, { days });
            expirations.set(client.uuid, client.expired_at);
          } else {
            expirations.delete(client.uuid);
          }
        }
        return node;
      });
      if (latestEvents.length) events = [...latestEvents.reverse(), ...events].slice(0, MAX_EVENTS);
      if (recordNetwork) networkHistory = [...networkHistory.slice(1 - MAX_SAMPLES), { time, up, down }];
    }

    function receive(frame: TelemetrySnapshot) {
      snapshot = frame;
      status = 'ready';
      updateNodes(frame, true);
      publish();
    }

    function disconnect() {
      status = snapshot ? 'reconnecting' : 'error';
      publish();
    }

    function lock() {
      clearTelemetry();
      loggedIn = false;
      status = 'private';
      publish();
    }

    function revokeSession(anonymous: boolean) {
      loggedIn = false;
      clearExpirations();
      if (site?.private_site) {
        if (anonymous) {
          lock();
          return;
        }
        clearTelemetry();
        status = 'error';
      }
      publish();
    }

    async function validate() {
      if (stopped || mock || validation) return;
      const request = new AbortController();
      validation = request;
      const { signal } = request;
      if (!sessionPending) {
        sessionPending = true;
        if (loggedIn) publish();
      }
      try {
        const session = verifySessionMe(signal).then(result => {
          if (validation === request && !result.logged_in) revokeSession(true);
          return result;
        }, error => {
          if (validation === request) revokeSession(false);
          throw error;
        });
        const publicSite = fetchSite(signal).then(value => {
          if (validation === request && value.private_site && !site?.private_site) {
            site = value;
            publish();
          }
          return value;
        });
        const nodeList = fetchNodes(signal).catch(error => {
          if (validation === request && isPrivate(error)) lock();
          throw error;
        });
        const [siteResult, sessionResult, nodesResult] = await Promise.allSettled([
          publicSite, session, nodeList,
        ]);
        if (validation !== request) return;
        const bootstrap = initial;
        initial = false;
        if (siteResult.status === 'fulfilled') site = siteResult.value;
        loggedIn = sessionResult.status === 'fulfilled' && sessionResult.value.logged_in;
        sessionPending = false;
        if ((site?.private_site && sessionResult.status === 'fulfilled' && !loggedIn) ||
          (nodesResult.status === 'rejected' && isPrivate(nodesResult.reason))) {
          lock();
          return;
        }
        if (siteResult.status === 'rejected' || nodesResult.status === 'rejected' ||
          (site?.private_site && sessionResult.status === 'rejected')) {
          if (import.meta.env.DEV && bootstrap && !site?.private_site && !loggedIn &&
            (sessionResult.status === 'fulfilled' || isUnavailable(sessionResult.reason)) &&
            (siteResult.status === 'fulfilled' || isUnavailable(siteResult.reason)) &&
            (nodesResult.status === 'fulfilled' || isUnavailable(nodesResult.reason))) {
            // A static import would put fixtures in the production bundle.
            const { startMock } = await import('../api/mock');
            if (validation !== request) return;
            mock = true;
            const demo = startMock(receive);
            site = demo.site;
            setClients(demo.clients);
            dataSource = demo.dataSource;
            stopTransport = demo.stop;
            networkHistory = demo.networkHistory;
            receive(demo.snapshot);
            return;
          }
          if (site?.private_site) clearTelemetry();
          if (snapshot) updateNodes(snapshot, false);
          disconnect();
          return;
        }
        setClients(nodesResult.value);
        if (snapshot) {
          updateNodes(snapshot, false);
          publish();
        } else {
          status = 'loading';
          publish();
        }
        stopTransport ??= subscribeTelemetry(receive, disconnect, () => {
          validation?.abort();
          validation = undefined;
          lock();
        });
      } catch (error) {
        if (validation === request) {
          sessionPending = false;
          if (initial) loggedIn = false;
          if (site?.private_site) clearTelemetry();
          clearExpirations();
          console.error(error);
          disconnect();
        }
      } finally {
        if (validation === request) validation = undefined;
      }
    }

    function revalidate() {
      if (mock || document.hidden) return;
      void validate();
    }

    function visibility() {
      if (!mock && document.hidden) {
        validation?.abort();
        validation = undefined;
        sessionPending = true;
        publish();
      } else {
        revalidate();
      }
    }

    void validate();
    const sessionTimer = setInterval(revalidate, SESSION_PERIOD);
    window.addEventListener('focus', revalidate);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      stopped = true;
      validation?.abort();
      validation = undefined;
      stopTransport?.();
      clearInterval(sessionTimer);
      window.removeEventListener('focus', revalidate);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);

  const { site, loggedIn, nodes, events } = state;
  if (loggedIn && site?.theme_settings.show_pricing) return state;
  return {
    ...state,
    nodes: nodes.map(({ price: _price, currency: _currency, billing_cycle: _cycle, auto_renewal: _renewal, expired_at: _expiry, ...node }) => node),
    events: events.filter(event => event.kind !== 'expiring'),
  };
}
