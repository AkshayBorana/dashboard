import { Component, input, output, signal, computed, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DropdownOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dropdown.component.html',
  styleUrl: './dropdown.component.scss'
})
export class DropdownComponent {
  // Input signals
  options = input.required<DropdownOption[]>();
  placeholder = input<string>('Select an option');
  selectedValue = input<string | null>(null);
  disabled = input<boolean>(false);

  // Output signals
  selectionChange = output<string>();

  // Internal state
  isOpen = signal<boolean>(false);

  constructor(private elementRef: ElementRef) {}

  // Computed signal for selected label - updates reactively
  selectedLabel = computed(() => {
    const selected = this.options().find(opt => opt.value === this.selectedValue());
    return selected ? selected.label : this.placeholder();
  });

  /**
   * Handle option selection
   */
  selectOption(option: DropdownOption): void {
    this.selectionChange.emit(option.value);
    this.isOpen.set(false);
  }

  /**
   * Toggle dropdown open/close state
   */
  toggleDropdown(): void {
    if (!this.disabled()) {
      this.isOpen.update(value => !value);
    }
  }

  /**
   * Close dropdown when clicking outside
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!this.elementRef.nativeElement.contains(target)) {
      this.isOpen.set(false);
    }
  }

  /**
   * Check if an option is selected
   */
  isSelected(option: DropdownOption): boolean {
    return option.value === this.selectedValue();
  }
}
