import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './command';
import { Button } from './button';
import { ChevronDown, Plus, Search } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Combobox({ 
  options, 
  value, 
  onSelect, 
  placeholder, 
  allowCustom = false 
}: { 
  options: (string | { label: string, value: string, searchName?: string, displayValue?: string })[], 
  value: string, 
  onSelect: (val: string) => void, 
  placeholder: string,
  allowCustom?: boolean
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const normalizedOptions = options.map(opt => 
    typeof opt === 'string' ? { label: opt, value: opt, searchName: opt, displayValue: opt } : { searchName: opt.label, displayValue: opt.label, ...opt }
  );

  const selectedOption = normalizedOptions.find(opt => opt.value === value);
  const displayValue = selectedOption ? selectedOption.displayValue : (allowCustom ? value : "");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-14 w-full justify-between bg-[#111827]/50 border-border hover:bg-[#111827]/70 text-sm font-medium rounded-xl"
          >
            <span className={cn("truncate", !displayValue && "text-muted-foreground")}>
              {displayValue || placeholder}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-[#0b1224] border-border shadow-2xl">
        <Command className="bg-transparent">
          <div className="flex items-center border-b border-border px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput 
              placeholder="Pesquisar ou criar..." 
              value={search}
              onValueChange={setSearch}
              className="h-12 bg-transparent outline-none border-none focus:ring-0"
            />
          </div>
          <CommandList className="max-h-[300px] overflow-y-auto custom-scrollbar">
            <CommandEmpty className="py-6 text-center text-sm">
              {allowCustom && search ? (
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-2 h-10 px-4 hover:bg-primary/10 text-primary font-bold"
                  onClick={() => {
                    onSelect(search);
                    setOpen(false);
                  }}
                >
                  <Plus className="w-4 h-4" /> Criar "{search}"
                </Button>
              ) : "Nenhum resultado encontrado."}
            </CommandEmpty>
            <CommandGroup>
              {allowCustom && search && !normalizedOptions.some(opt => opt.searchName.toLowerCase() === search.toLowerCase() || opt.label.toLowerCase() === search.toLowerCase()) && (
                <CommandItem
                  value={search}
                  onSelect={() => {
                    onSelect(search);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 px-4 py-3 cursor-pointer text-primary font-bold hover:bg-primary/10"
                >
                  <Plus className="w-4 h-4" /> Criar "{search}"
                </CommandItem>
              )}
              {normalizedOptions.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={(currentValue) => {
                    // CommandItem lowercases the value sometimes in its own onSelect,
                    // but since we only care about opt.value, we just use it directly.
                    onSelect(opt.value);
                    setOpen(false);
                  }}
                  className="px-4 py-3 cursor-pointer hover:bg-white/5"
                >
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
