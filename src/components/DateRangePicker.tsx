import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Check } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { cn } from '../lib/utils';
import { Button, buttonVariants } from './ui/button';
import { Calendar } from './ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';

interface DateRangePickerProps {
  onApply: (range: { from: Date; to: Date } | undefined) => void;
  initialRange?: { from: Date; to: Date };
  className?: string;
}

export function DateRangePicker({ onApply, initialRange, className }: DateRangePickerProps) {
  const [date, setDate] = useState<DateRange | undefined>(
    initialRange ? { from: initialRange.from, to: initialRange.to } : undefined
  );

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger
          id="date"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "w-full justify-start text-left font-bold uppercase tracking-widest text-[10px] h-12 px-6 rounded-[20px] bg-card/50 border-border hover:bg-white/5",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-3 h-4 w-4 text-primary" />
          {date?.from ? (
            date.to ? (
              <>
                {format(date.from, "dd/MM/yy", { locale: ptBR })} -{" "}
                {format(date.to, "dd/MM/yy", { locale: ptBR })}
              </>
            ) : (
              format(date.from, "dd/MM/yy", { locale: ptBR })
            )
          ) : (
            <span>Selecionar Período</span>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-[#0b1224] border-border" align="start">
          <div className="p-4 border-b border-white/5 bg-black/20">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Intervalo Personalizado</h4>
            <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Selecione o início e o fim do período</p>
          </div>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
            locale={ptBR}
            className="p-3"
          />
          <div className="p-4 border-t border-white/5 bg-black/20 flex flex-col gap-3">
             <div className="flex items-center justify-between px-2">
                <div className="space-y-1">
                   <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Início</p>
                   <p className="text-[10px] font-black text-white uppercase tracking-widest">{date?.from ? format(date.from, "dd 'DE' MMM", { locale: ptBR }) : '--'}</p>
                </div>
                <div className="w-4 h-[1px] bg-white/10" />
                <div className="text-right space-y-1">
                   <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Fim</p>
                   <p className="text-[10px] font-black text-white uppercase tracking-widest">{date?.to ? format(date.to, "dd 'DE' MMM", { locale: ptBR }) : '--'}</p>
                </div>
             </div>
             <Button 
                onClick={() => {
                  if (date?.from && date?.to) {
                    onApply({ from: date.from, to: date.to });
                  } else if (date?.from) {
                     onApply({ from: date.from, to: date.from });
                  }
                }}
                disabled={!date?.from}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-xl gap-3 shadow-lg shadow-primary/20"
             >
                <Check className="w-4 h-4" />
                Confirmar Filtro
             </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
