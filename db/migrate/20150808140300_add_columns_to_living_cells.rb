class AddColumnsToLivingCells < ActiveRecord::Migration
  def change
    add_column :living_cells, :row, :integer
    add_column :living_cells, :column, :integer
  end
end
