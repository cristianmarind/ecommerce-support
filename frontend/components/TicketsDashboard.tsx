'use client';

import { useCallback, useEffect, useState } from 'react';
import { getTickets, PaginatedTickets } from '@/lib/api';
import { TicketForm } from './TicketForm';
import { TicketsTable } from './TicketsTable';

const PAGE_SIZE = 5;

export function TicketsDashboard() {
  const [data, setData] = useState<PaginatedTickets | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTickets = useCallback(async (targetPage: number) => {
    setIsLoading(true);
    try {
      const result = await getTickets(targetPage, PAGE_SIZE);
      setData(result);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets(page);
  }, [page, fetchTickets]);

  function handleCreated() {
    setPage(1);
    fetchTickets(1);
  }

  return (
    <div className="flex flex-col gap-6">
      <TicketForm onCreated={handleCreated} />
      <TicketsTable data={data} isLoading={isLoading} onPageChange={setPage} />
    </div>
  );
}
