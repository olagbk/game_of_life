class AddGameIdToLivingCells < ActiveRecord::Migration
  def change
    add_column :living_cells, :game_id, :integer
  end
end
