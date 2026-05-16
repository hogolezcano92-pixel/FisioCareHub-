import { supabase } from '../lib/supabase';

export type AvailabilityRule = {
  id?: string;
  physio_id: string;
  weekday: number; // 0 domingo, 1 segunda ... 6 sábado
  start_time: string;
  end_time: string;
  session_duration_minutes: number;
  buffer_minutes: number;
  min_notice_hours: number;
  cancellation_notice_hours: number;
  is_active: boolean;
};

export type ScheduleBlock = {
  id?: string;
  physio_id: string;
  block_date: string;
  start_time?: string | null;
  end_time?: string | null;
  reason?: string | null;
};

export type Slot = {
  date: string;
  time: string;
  label: string;
};

const pad = (value: number) => String(value).padStart(2, '0');

export const toDateKey = (date: Date) => {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const normalizeTime = (time?: string | null) => (time || '').slice(0, 5);

const timeToMinutes = (time: string) => {
  const [hours, minutes] = normalizeTime(time).split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

const minutesToTime = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

const addMinutes = (time: string, minutes: number) => minutesToTime(timeToMinutes(time) + minutes);

const overlaps = (slotStart: string, slotEnd: string, blockStart?: string | null, blockEnd?: string | null) => {
  if (!blockStart || !blockEnd) return true;
  return timeToMinutes(slotStart) < timeToMinutes(blockEnd) && timeToMinutes(slotEnd) > timeToMinutes(blockStart);
};

const getDateAtTime = (date: string, time: string) => new Date(`${date}T${normalizeTime(time)}:00`);

export const availabilityService = {
  async getRules(physioId: string) {
    const { data, error } = await supabase
      .from('physio_availability_rules')
      .select('*')
      .eq('physio_id', physioId)
      .order('weekday')
      .order('start_time');

    if (error) throw error;
    return (data || []) as AvailabilityRule[];
  },

  async getBlocks(physioId: string, startDate?: string, endDate?: string) {
    let query = supabase
      .from('physio_schedule_blocks')
      .select('*')
      .eq('physio_id', physioId)
      .order('block_date')
      .order('start_time');

    if (startDate) query = query.gte('block_date', startDate);
    if (endDate) query = query.lte('block_date', endDate);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as ScheduleBlock[];
  },

  async replaceRules(physioId: string, rules: AvailabilityRule[]) {
    const { error: deleteError } = await supabase
      .from('physio_availability_rules')
      .delete()
      .eq('physio_id', physioId);

    if (deleteError) throw deleteError;

    const activeRules = rules
      .filter((rule) => rule.start_time && rule.end_time)
      .map((rule) => ({
        physio_id: physioId,
        weekday: rule.weekday,
        start_time: rule.start_time,
        end_time: rule.end_time,
        session_duration_minutes: Number(rule.session_duration_minutes) || 60,
        buffer_minutes: Number(rule.buffer_minutes) || 0,
        min_notice_hours: Number(rule.min_notice_hours) || 2,
        cancellation_notice_hours: Number(rule.cancellation_notice_hours) || 24,
        is_active: Boolean(rule.is_active),
      }));

    if (activeRules.length === 0) return [];

    const { data, error } = await supabase
      .from('physio_availability_rules')
      .insert(activeRules)
      .select();

    if (error) throw error;
    return data as AvailabilityRule[];
  },

  async createBlock(block: ScheduleBlock) {
    const { data, error } = await supabase
      .from('physio_schedule_blocks')
      .insert({
        physio_id: block.physio_id,
        block_date: block.block_date,
        start_time: block.start_time || null,
        end_time: block.end_time || null,
        reason: block.reason || 'Indisponível',
      })
      .select()
      .single();

    if (error) throw error;
    return data as ScheduleBlock;
  },

  async deleteBlock(id: string) {
    const { error } = await supabase
      .from('physio_schedule_blocks')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getBookedAppointments(physioId: string, startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('agendamentos')
      .select('id, data, hora, status')
      .eq('fisio_id', physioId)
      .gte('data', startDate)
      .lte('data', endDate)
      .not('status', 'in', '(cancelado,recusado,pendente_pagamento)');

    if (error) throw error;
    return data || [];
  },

  generateSlots(rules: AvailabilityRule[], blocks: ScheduleBlock[], bookedAppointments: any[], daysAhead = 30): Slot[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const booked = new Set(
      bookedAppointments
        .filter((item) => item.data && item.hora)
        .map((item) => `${item.data}|${normalizeTime(item.hora)}`)
    );

    const slots: Slot[] = [];

    for (let index = 0; index < daysAhead; index += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      const dateKey = toDateKey(date);
      const weekday = date.getDay();
      const dayRules = rules.filter((rule) => rule.weekday === weekday && rule.is_active);
      const dayBlocks = blocks.filter((block) => block.block_date === dateKey);

      dayRules.forEach((rule) => {
        const duration = Number(rule.session_duration_minutes) || 60;
        const step = duration + (Number(rule.buffer_minutes) || 0);
        const minStart = timeToMinutes(rule.start_time);
        const maxStart = timeToMinutes(rule.end_time) - duration;

        for (let start = minStart; start <= maxStart; start += step) {
          const time = minutesToTime(start);
          const end = addMinutes(time, duration);
          const startsAt = getDateAtTime(dateKey, time);
          const minNoticeDate = new Date(now.getTime() + (Number(rule.min_notice_hours) || 0) * 60 * 60 * 1000);

          if (startsAt < minNoticeDate) continue;
          if (booked.has(`${dateKey}|${time}`)) continue;
          if (dayBlocks.some((block) => overlaps(time, end, block.start_time, block.end_time))) continue;

          slots.push({
            date: dateKey,
            time,
            label: `${time} às ${end}`,
          });
        }
      });
    }

    return slots;
  },
};
