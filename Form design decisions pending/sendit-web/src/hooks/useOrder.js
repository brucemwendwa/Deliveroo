import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrder, selectOrderById } from '../store/ordersSlice';
import useOrderSync from './useOrderSync';

/** Loads one order and keeps it live as the admin moves it along (§14, §18). */
export default function useOrder(id) {
  const dispatch = useDispatch();
  const order = useSelector(selectOrderById(id));
  const status = useSelector((state) => state.orders.status);
  const error = useSelector((state) => state.orders.error);

  useEffect(() => {
    if (id) dispatch(fetchOrder(id));
  }, [dispatch, id]);

  useOrderSync(() => {
    if (id) dispatch(fetchOrder(id));
  });

  return { order, loading: status === 'loading' && !order, error };
}
