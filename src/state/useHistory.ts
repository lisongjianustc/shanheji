import {useSyncExternalStore} from 'react';import type {HistoryController} from './controller';
export const useHistory=(controller:HistoryController)=>useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
